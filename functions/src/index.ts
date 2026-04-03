import { setGlobalOptions } from "firebase-functions";
import { onValueCreated } from "firebase-functions/v2/database";
import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();
setGlobalOptions({ maxInstances: 10, region: "us-central1" });

interface Task {
  title: string;
  memberId: string;
  teamMemberIds?: Record<string, string> | string[];
  type?: string;
}

interface FCMToken {
  token: string;
}

// يشتغل لما تُنشأ مهمة جديدة
export const onTaskCreated = onValueCreated(
  { ref: "/tasks/{taskId}", region: "us-central1" },
  async (event) => {
    const task = event.data.val() as Task;
    if (!task) return;

    const db = getDatabase();
    const messaging = getMessaging();

    // جمّع كل المستخدمين اللي تخصهم المهمة
    const userIds = new Set<string>();
    if (task.memberId) userIds.add(task.memberId);
    if (task.teamMemberIds) {
      const ids = Array.isArray(task.teamMemberIds)
        ? task.teamMemberIds
        : Object.values(task.teamMemberIds);
      ids.forEach((id) => userIds.add(id));
    }

    // جيب tokens من RTDB وأرسل لكل واحد
    const sendPromises = Array.from(userIds).map(async (uid) => {
      const snap = await db.ref(`fcmTokens/${uid}`).get();
      const data = snap.val() as FCMToken | null;
      if (!data?.token) return;

      await messaging.send({
        token: data.token,
        notification: {
          title: "مهمة جديدة 📋",
          body: task.title || "تم إسناد مهمة جديدة لك",
        },
        android: { notification: { sound: "default" } },
        apns: { payload: { aps: { sound: "default" } } },
        webpush: {
          notification: {
            icon: "/assets/apple-touch-icon.png",
            dir: "rtl",
            lang: "ar",
            badge: "/assets/apple-touch-icon.png",
          },
        },
      });
    });

    await Promise.allSettled(sendPromises);
  }
);
