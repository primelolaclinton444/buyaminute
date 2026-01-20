import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function createNotification(params: {
  userId: string;
  type: string;
  data: Prisma.JsonObject;
  idempotencyKey: string;
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        data: params.data,
        idempotencyKey: params.idempotencyKey,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return null;
    }
    throw err;
  }
}
