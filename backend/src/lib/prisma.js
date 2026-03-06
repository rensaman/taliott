import { PrismaClient } from '@prisma/client';

let _prisma;
export const getPrisma = () => (_prisma ??= new PrismaClient());
