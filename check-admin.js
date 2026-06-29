const { PrismaClient } = require("@prisma/client");
const b = require("bcryptjs");
(async () => {
  const d = new PrismaClient();
  const u = await d.user.findUnique({ where: { email: "admin@clipku.com" } });
  console.log("User:", u ? u.email : "NOT FOUND", "role:", u?.role);
  if (u) {
    const ok = await b.compare("le0Jb7p9zEa8vCUayz25NBssEuRcUfdq", u.passwordHash);
    console.log("Password match:", ok);
  }
  await d.$disconnect();
})();
