import type { H3Event } from "h3";
import { useRuntimeConfig } from "#imports";

type SendFonnteMessageInput = {
  message: string;
  target: string;
};

type FonnteResponse = {
  status?: boolean;
  reason?: string;
  detail?: unknown;
};

function normalizeCountryCode(countryCode: unknown) {
  return String(countryCode ?? "62").replace(/\D/g, "") || "62";
}

function normalizeWhatsAppTarget(phoneNumber: string, countryCode: string) {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const digitsOnly = String(phoneNumber).replace(/\D/g, "");

  if (!digitsOnly) {
    throw new Error("Nomor WhatsApp fotografer belum diisi.");
  }

  if (digitsOnly.startsWith(normalizedCountryCode)) {
    return digitsOnly;
  }

  if (digitsOnly.startsWith("0")) {
    return `${normalizedCountryCode}${digitsOnly.replace(/^0+/, "")}`;
  }

  return `${normalizedCountryCode}${digitsOnly}`;
}

function getFonnteErrorMessage(response: FonnteResponse | string) {
  if (typeof response === "string") {
    return response;
  }

  return response.reason || "Fonnte tidak menerima pesan.";
}

export async function sendFonnteMessage(
  event: H3Event,
  input: SendFonnteMessageInput,
) {
  const config = useRuntimeConfig(event);
  const token = String(config.fonnteToken ?? "").trim();
  const countryCode = normalizeCountryCode(config.fonnteCountryCode);

  if (!token) {
    throw new Error("NUXT_FONNTE_TOKEN belum dikonfigurasi.");
  }

  const body = new URLSearchParams({
    countryCode,
    message: input.message,
    target: normalizeWhatsAppTarget(input.target, countryCode),
  });

  const response = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const responseText = await response.text();
  let responseBody: FonnteResponse | string = responseText;

  try {
    responseBody = JSON.parse(responseText) as FonnteResponse;
  } catch {
    responseBody = responseText;
  }

  if (!response.ok || (typeof responseBody === "object" && responseBody.status === false)) {
    throw new Error(getFonnteErrorMessage(responseBody));
  }

  return responseBody;
}
