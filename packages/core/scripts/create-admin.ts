
import { getDynamicDb } from "../lib/db/dynamic";
import { users, developers } from "../lib/db/schema";
import { hashPassword } from "../lib/hash";

async function createAdmin() {
    const db = await getDynamicDb();
    const email = "admin@heisoo.com";
    const password = "admin1234";

    // Check if user exists
    const existing = await db.query.users.findFirst({
        where: (t, { eq }) => eq(t.email, email),
    });

    let userId = existing?.id;

    if (!existing) {
        console.log(`Creating user ${email}...`);
        const hashedPassword = await hashPassword(password);
        const [inserted] = await db.insert(users).values({
            email,
            name: "Admin User",
            password: hashedPassword,
            active: true,
            mustChangePassword: true, // Force change on first login
        }).returning({ id: users.id });
        userId = inserted.id;
        console.log(`User created with ID: ${userId}`);
    } else {
        console.log(`User ${email} already exists.`);
    }

    // Ensure developer record exists
    if (userId) {
        const dev = await db.query.developers.findFirst({
            where: (t, { eq }) => eq(t.userId, userId!),
        });

        if (!dev) {
            console.log(`Assigning developer role to user ${userId}...`);
            await db.insert(developers).values({
                userId,
            });
            console.log("Developer role assigned.");
        } else {
            console.log("User already has developer role.");
        }
    }
}

createAdmin().catch(console.error);
