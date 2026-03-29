import { getUserInfo } from "../users.service.js";
export const getSelfInfo = async (req, res) => {
    const userId = req.user.id;
    const { refreshTokens, ...user } = await getUserInfo(userId);
    res.status(200).json({ user, sessions: refreshTokens });
};
//# sourceMappingURL=me.controllers.js.map