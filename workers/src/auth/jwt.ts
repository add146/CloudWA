import { SignJWT, jwtVerify } from 'jose';
import type { UserPayload } from '@/types/env';

const ALGORITHM = 'HS256';
const EXPIRATION = '7d'; // 7 days

export async function createToken(
    payload: UserPayload,
    secret: string
): Promise<string> {
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(secret);

    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: ALGORITHM })
        .setIssuedAt()
        .setExpirationTime(EXPIRATION)
        .sign(secretKey);

    return token;
}

export async function verifyToken(
    token: string,
    secret: string
): Promise<UserPayload> {
    try {
        const encoder = new TextEncoder();
        const secretKey = encoder.encode(secret);

        const { payload } = await jwtVerify(token, secretKey, {
            algorithms: [ALGORITHM],
        });

        return payload as UserPayload;
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}
