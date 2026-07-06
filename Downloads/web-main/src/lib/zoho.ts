const ZOHO_ACCOUNTS_DOMAIN = process.env.ZOHO_ACCOUNTS_DOMAIN ?? "accounts.zoho.in";
const ZOHO_TOKEN_URL = `https://${ZOHO_ACCOUNTS_DOMAIN}/oauth/v2/token`;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Zoho CRM credentials (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN) are not configured.");
  }

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const res = await fetch(ZOHO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const rawText = await res.text();
  console.log("[zoho] token response:", res.status, rawText);

  if (!res.ok) {
    throw new Error(`Zoho token request failed (${res.status}): ${rawText}`);
  }

  const json = JSON.parse(rawText) as { access_token?: string; error?: string };
  if (!json.access_token) {
    throw new Error(`Zoho token error: ${json.error ?? "no access_token returned"}`);
  }

  return json.access_token;
}

function splitName(fullName: string): { First_Name: string; Last_Name: string } {
  const trimmed = fullName.trim();
  const idx = trimmed.indexOf(" ");
  if (idx === -1) return { First_Name: "", Last_Name: trimmed };
  return { First_Name: trimmed.slice(0, idx), Last_Name: trimmed.slice(idx + 1) };
}

export async function createZohoLead(data: {
  name: string;
  email: string;
  company: string;
  industry: string;
  size: string;
  requirements: string;
}): Promise<void> {
  const domain = process.env.ZOHO_API_DOMAIN ?? "www.zohoapis.com";
  const token = await getAccessToken();
  const { First_Name, Last_Name } = splitName(data.name);

  const res = await fetch(`https://${domain}/crm/v2/Leads`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [
        {
          First_Name,
          Last_Name,
          Email: data.email,
          Company: data.company,
          Industry: data.industry,
          No_of_Employees: data.size,
          Description: data.requirements,
          Lead_Source: "Website",
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Zoho Leads creation failed (${res.status}): ${await res.text()}`);
  }
}

export async function createZohoContact(data: {
  fullName: string;
  email: string;
  phone?: string;
  linkedin?: string;
  role: string;
  message: string;
}): Promise<void> {
  const domain = process.env.ZOHO_API_DOMAIN ?? "www.zohoapis.com";
  const token = await getAccessToken();
  const { First_Name, Last_Name } = splitName(data.fullName);

  const description = [
    `Role: ${data.role}`,
    data.linkedin ? `LinkedIn / Portfolio: ${data.linkedin}` : null,
    "",
    "Why this role:",
    data.message,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const res = await fetch(`https://${domain}/crm/v2/Contacts`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [
        {
          First_Name,
          Last_Name,
          Email: data.email,
          ...(data.phone ? { Phone: data.phone } : {}),
          Description: description,
          Lead_Source: "Career Application",
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Zoho Contacts creation failed (${res.status}): ${await res.text()}`);
  }
}
