import { auth } from "@heiso/core/modules/auth/auth.config";
import { redirect } from "next/navigation";
import { getAccountByEmail } from "@heiso/core/lib/platform/account-adapter";
import AuthenticationForm from "./authentication-form";

export default async function AuthenticationPage() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    const user = await getAccountByEmail(session.user.email);

    // If loginMethod is null or undefined, treat as "credentials" (Email/Password)
    const loginMethod = user?.loginMethod || "credentials";

    return <AuthenticationForm loginMethod={loginMethod} />;
}
