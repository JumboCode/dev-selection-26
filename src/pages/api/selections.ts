import type { APIRoute } from "astro";
import {
  createAuthenticatedSupabaseClient,
  isSameOriginRequest,
} from "../../lib/supabase";

type SelectionType = "selected" | "waitlisted" | "saved";

const SELECTION_TYPES: readonly unknown[] = ["selected", "waitlisted", "saved"];

interface SelectionRequest {
  fakeName?: unknown;
  teamName?: unknown;
  selectionType?: unknown;
}

function errorStatus(code?: string): number {
  if (code === "42501") return 403;
  if (code === "P0002") return 404;
  if (code === "23503" || code === "22P02") return 400;
  return 409;
}

async function readBody(request: Request): Promise<SelectionRequest | null> {
  try {
    return (await request.json()) as SelectionRequest;
  } catch {
    return null;
  }
}

function validNames(body: SelectionRequest | null): body is SelectionRequest & {
  fakeName: string;
  teamName: string;
} {
  return Boolean(
    body &&
      typeof body.fakeName === "string" &&
      body.fakeName.trim() &&
      typeof body.teamName === "string" &&
      body.teamName.trim(),
  );
}

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!isSameOriginRequest(request, url)) {
    return new Response("Invalid request origin", { status: 403 });
  }

  const body = await readBody(request);
  if (
    !validNames(body) ||
    !SELECTION_TYPES.includes(body.selectionType)
  ) {
    return new Response("Invalid selection request", { status: 400 });
  }

  const auth = await createAuthenticatedSupabaseClient(cookies);
  if (!auth) {
    return new Response("Authentication required", { status: 401 });
  }

  const { data, error } = await auth.supabase.rpc("set_developer_selection", {
    p_fake_name: body.fakeName.trim(),
    p_team_name: body.teamName.trim(),
    p_selection_type: body.selectionType as SelectionType,
  });

  if (error) {
    return Response.json(
      { error: error.message },
      { status: errorStatus(error.code) },
    );
  }

  return Response.json({ selection: data });
};

export const DELETE: APIRoute = async ({ request, cookies, url }) => {
  if (!isSameOriginRequest(request, url)) {
    return new Response("Invalid request origin", { status: 403 });
  }

  const body = await readBody(request);
  if (!validNames(body)) {
    return new Response("Invalid selection request", { status: 400 });
  }

  const auth = await createAuthenticatedSupabaseClient(cookies);
  if (!auth) {
    return new Response("Authentication required", { status: 401 });
  }

  const { data, error } = await auth.supabase.rpc(
    "remove_developer_selection",
    {
      p_fake_name: body.fakeName.trim(),
      p_team_name: body.teamName.trim(),
    },
  );

  if (error) {
    return Response.json(
      { error: error.message },
      { status: errorStatus(error.code) },
    );
  }

  return Response.json({ removed: data });
};
