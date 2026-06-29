const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const db = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash("le0Jb7p9zEa8vCUayz25NBssEuRcUfdq", 12);
  const user = await db.user.upsert({
    where: { email: "admin@clipku.com" },
    update: { passwordHash: hash, role: "SUPER_ADMIN" },
    create: { name: "Admin", email: "admin@clipku.com", passwordHash: hash, role: "SUPER_ADMIN" }
  });
  console.log("Admin ready:", user.email, user.role);
  await db.$disconnect();
})();
