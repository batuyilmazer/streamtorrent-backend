import type { Request, Response } from "express";
import { getUserInfo } from "../users.service.js";
import { requireUserId } from "../../common/requestContext.js";

export const getSelfInfo = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { refreshTokens, ...user } = await getUserInfo(userId);
  res.status(200).json({ user, sessions: refreshTokens });
};
