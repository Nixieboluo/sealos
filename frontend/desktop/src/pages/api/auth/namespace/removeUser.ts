import { jsonRes } from '@/services/backend/response';
import { modifyWorkspaceRole, unbindingRole } from '@/services/backend/team';
import { NextApiRequest, NextApiResponse } from 'next';
import { roleToUserRole, vaildManage } from '@/utils/tools';
import { validate } from 'uuid';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { JoinStatus } from 'prisma/region/generated/client';
import { verifyAccessToken } from '@/services/backend/auth';
import { Role } from 'prisma/region/generated/client';
import { getRegionUid } from '@/services/enable';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { ns_uid, targetUserCrUid } = req.body as {
      ns_uid?: string;
      targetUserCrUid?: string;
    };

    if (!ns_uid || !validate(ns_uid))
      return jsonRes(res, { code: 400, message: 'ns_id is invalid' });
    if (!targetUserCrUid || !validate(targetUserCrUid))
      return jsonRes(res, { code: 400, message: 'tUserId is invalid' });

    const queryResults = await prisma.userWorkspace.findMany({
      where: {
        workspaceUid: ns_uid,
        userCrUid: {
          in: [payload.userCrUid, targetUserCrUid]
        }
      },
      include: {
        workspace: true,
        userCr: true
      }
    });
    const own = queryResults.find((x) => x.userCrUid === payload.userCrUid);

    if (!own || own.status !== JoinStatus.IN_WORKSPACE)
      return jsonRes(res, { code: 403, message: 'you are not in the namespace' });
    if (targetUserCrUid === payload.userCrUid && own.role === Role.OWNER) {
      return jsonRes(res, { code: 403, message: 'target user must be others' });
    }
    const tItem = queryResults.find((item) => item.userCr.uid === targetUserCrUid);
    // for inviting state,
    if (!tItem) return jsonRes(res, { code: 404, message: 'target user is not in namespace' });
    const vaild = vaildManage(roleToUserRole(own.role))(
      roleToUserRole(tItem.role),
      tItem.userCrUid === payload.userCrUid
    );
    if (!vaild) return jsonRes(res, { code: 403, message: 'you are not manager' });
    let unbinding_result = null;
    if (JoinStatus.INVITED === tItem.status) {
      // equal to cancel inviting
      unbinding_result = await unbindingRole({
        userCrUid: tItem.userCrUid,
        workspaceUid: ns_uid
      });
    } else if (JoinStatus.IN_WORKSPACE === tItem.status) {
      const ownerResult = queryResults.find((qr) => qr.role === 'OWNER');
      if (!ownerResult) {
        throw new Error('no owner in workspace');
      }

      // try {
      await modifyWorkspaceRole({
        k8s_username: tItem.userCr.crName,
        role: roleToUserRole(tItem.role),
        action: 'Deprive',
        workspaceId: own.workspace.id,
        pre_role: roleToUserRole(tItem.role)
      });
      unbinding_result = await unbindingRole({
        userCrUid: tItem.userCrUid,
        workspaceUid: ns_uid
      });

      // modify role
      const regionUid = getRegionUid();
      await globalPrisma.$transaction(async (tx) => {
        const ownerStatus = await tx.workspaceUsage.findUnique({
          where: {
            regionUid_userUid_workspaceUid: {
              regionUid,
              userUid: ownerResult.userCr.userUid,
              workspaceUid: ns_uid
            }
          }
        });
        if (!ownerStatus) {
          // 被其他的操作删了workspace,本次更新白干
          return;
        }
        // sync status, owner seat sub 1,
        await tx.workspaceUsage.update({
          where: {
            regionUid_userUid_workspaceUid: {
              userUid: ownerStatus.userUid,
              workspaceUid: ns_uid,
              regionUid
            }
          },
          data: {
            seat: ownerStatus.seat - 1 > 0 ? ownerStatus.seat - 1 : 1
          }
        });
      });
    } else {
      return jsonRes(res, { code: 404, message: 'target user is not in namespace' });
    }
    if (!unbinding_result) throw new Error('fail to remove team memeber role');
    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'fail to remove team member' });
  }
}
