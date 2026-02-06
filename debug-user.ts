
import { getDynamicDb } from "./packages/core/lib/db/dynamic";
import { users } from "./packages/core/lib/db/schema";
import { eq } from "drizzle-orm";

async function checkUser() {
    const db = await getDynamicDb();
    const user = await db.query.users.findFirst({
        where: eq(users.email, "admin@heisoo.com"),
    });
    console.log("User admin@heisoo.com:", JSON.stringify(user, null, 2));

    const allUsers = await db.query.users.findMany();
    console.log("All Users:", JSON.stringify(allUsers.map(u => u.email), null, 2));
}

checkUser().catch(console.error);
