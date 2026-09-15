export function parseProjectInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid project data.");
  }
  const body = input as Record<string, unknown>;
  function text(key: string, label: string, max = 200) {
    const value = body[key];
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
      throw new Error(`${label} is required and must not exceed ${max} characters.`);
    }
    return value.trim();
  }
  function phone(key: string, label: string) {
    const value = text(key, label, 30);
    if (!/^\+?[\d\s()-]+$/.test(value)) {
      throw new Error(`${label} must be a valid Indonesian phone number.`);
    }
    const digits = value.replace(/\D/g, "");
    if (value.startsWith("+") && !digits.startsWith("62")) {
      throw new Error(`${label} must use the Indonesian country code (+62).`);
    }
    const national = digits.startsWith("62") ? digits.slice(2) : digits.startsWith("0") ? digits.slice(1) : digits;
    if (!/^[1-9]\d{7,12}$/.test(national)) {
      throw new Error(`${label} must be a valid Indonesian phone number.`);
    }
    return `62${national}`;
  }
  const folder = text("drive_folder_id", "Google Drive folder", 2048);
  const folderId = folder.match(/^https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)(?:[/?#].*)?$/)?.[1] ?? folder;
  if (!/^[a-zA-Z0-9_-]+$/.test(folderId)) throw new Error("Invalid Google Drive folder link or ID.");
  if (typeof body.selection_limit !== "number" || !Number.isInteger(body.selection_limit) || body.selection_limit < 1 || body.selection_limit > 10000) {
    throw new Error("Selection limit must be a whole number between 1 and 10000.");
  }
  return {
    title: text("title", "Title"),
    client_name: text("client_name", "Client name"),
    client_phone: phone("client_phone", "Client phone number"),
    photographer_name: text("photographer_name", "Photographer name"),
    photographer_phone: phone("photographer_phone", "Photographer phone number"),
    drive_folder_id: folderId,
    selection_limit: body.selection_limit,
  };
}
