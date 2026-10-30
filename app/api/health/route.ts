import { connection } from "next/server";
import { providerNames } from "@/server/providers/types";
import { createProviders } from "@/server/providers/index";

export async function GET() {
  await connection();
  const providers = createProviders();
  return Response.json({
    ok: true,
    providers: providerNames(providers),
  });
}
