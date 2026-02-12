import { getDynamicDb } from "@heiso/core/lib/db/dynamic";
import { users } from "@heiso/core/lib/db/schema";
import { auth } from "@heiso/core/modules/auth/auth.config";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import AuthenticationForm from "./authentication-form";

export default async function AuthenticationPage() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    const db = await getDynamicDb();
    const user = await db.query.users.findFirst({
        where: eq(users.email, session.user.email),
        columns: {
            loginMethod: true,
        },
    });

    // If loginMethod is null or undefined, treat as "credentials" (Email/Password)
    const loginMethod = user?.loginMethod || "credentials";

    return <AuthenticationForm loginMethod={loginMethod} />;
}
