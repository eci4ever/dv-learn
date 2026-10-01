import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Same-origin browser requests; never import the Worker auth instance here.
export const authClient = createAuthClient({ plugins: [adminClient()] });
