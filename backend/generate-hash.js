import argon2 from "argon2";

const password = "admin123";
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 2 ** 16,
    parallelism: 1,
  });
console.log("Hash para la contraseña 'admin123':");
console.log(hash);
