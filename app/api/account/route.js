import mongoose from "mongoose";
import { connection } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { destroySession, getSessionUserId } from "@/lib/session";
import { fail, json, serverError } from "@/lib/http";
import ContactMessage from "@/models/ContactMessage";
import User from "@/models/User";

export async function GET() {
  await connection();
  try {
    const userId = await getSessionUserId();
    if (!userId || !mongoose.isValidObjectId(userId)) {
      if (userId) await destroySession();
      return fail("Please log in to view your account.", 401);
    }

    await connectDB();
    const user = await User.findById(userId).select("name email createdAt");
    if (!user) {
      await destroySession();
      return fail("Please log in to view your account.", 401);
    }

    const ownInquiries = { user: user._id };
    const [total, awaitingReply, replied, inquiries] = await Promise.all([
      ContactMessage.countDocuments(ownInquiries),
      ContactMessage.countDocuments({ ...ownInquiries, status: { $ne: "replied" } }),
      ContactMessage.countDocuments({ ...ownInquiries, status: "replied" }),
      ContactMessage.find(ownInquiries)
        .sort({ createdAt: -1 })
        .limit(10)
        .select("subject message status createdAt")
        .lean(),
    ]);

    return json({
      profile: {
        name: user.name,
        email: user.email,
        joinedAt: user.createdAt,
      },
      summary: { total, awaitingReply, replied },
      inquiries: inquiries.map((inquiry) => ({
        id: String(inquiry._id),
        subject: inquiry.subject,
        message: inquiry.message,
        status: inquiry.status,
        createdAt: inquiry.createdAt,
      })),
    });
  } catch (err) {
    return serverError(err, "account");
  }
}
