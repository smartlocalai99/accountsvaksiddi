import { getUserFromRequest } from "@/lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const user = await getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({ success: false, user: null });
  }

  return res.status(200).json({ success: true, user });
}
