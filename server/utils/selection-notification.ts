import type { H3Event } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendFonnteMessage } from "./fonnte";

export type ProjectNotificationDetails = {
  client_name: string;
  id: string;
  photographer_name: string | null;
  photographer_phone: string | null;
  title: string;
};

export type NotificationResult = {
  channel: "whatsapp";
  error?: string;
  status: "sent" | "failed";
};

const filenameSorter = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Pesan WhatsApp gagal dikirim.";
}

function truncateErrorMessage(message: string) {
  return message.slice(0, 500);
}

export function createPhotographerSelectionMessage(
  project: ProjectNotificationDetails,
  selectedFilenames: string[],
) {
  const photographerName = project.photographer_name || "Kak";
  const sortedFilenames = [...selectedFilenames].sort(
    (firstFilename, secondFilename) =>
      filenameSorter.compare(firstFilename, secondFilename),
  );
  const filenameList = sortedFilenames
    .map((filename, index) => `${index + 1}. ${filename}`)
    .join("\n");

  return [
    `Halo ${photographerName},`,
    "",
    `${project.client_name} sudah submit pilihan foto untuk project:`,
    project.title,
    "",
    `Total dipilih: ${sortedFilenames.length} foto`,
    "",
    "Daftar file:",
    filenameList,
    "",
    "Terima kasih.",
    "Sutoori Production",
  ].join("\n");
}

export async function notifyPhotographerSelection(
  event: H3Event,
  supabase: SupabaseClient,
  project: ProjectNotificationDetails,
  selectedFilenames: string[],
) {
  const notification: NotificationResult = {
    channel: "whatsapp",
    status: "sent",
  };

  try {
    if (!project.photographer_phone) {
      throw new Error("Nomor WhatsApp fotografer belum diisi di project.");
    }

    await sendFonnteMessage(event, {
      target: project.photographer_phone,
      message: createPhotographerSelectionMessage(project, selectedFilenames),
    });

    await supabase
      .from("projects")
      .update({
        notification_error: null,
        notification_sent_at: new Date().toISOString(),
        notification_status: "sent",
      })
      .eq("id", project.id);
  } catch (error) {
    notification.status = "failed";
    notification.error = getErrorMessage(error);

    await supabase
      .from("projects")
      .update({
        notification_error: truncateErrorMessage(notification.error),
        notification_status: "failed",
      })
      .eq("id", project.id);
  }

  return notification;
}
