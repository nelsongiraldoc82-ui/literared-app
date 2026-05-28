import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    // Solo acepta métodos POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { email, password, name } = req.body;

    // Validaciones básicas
    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    try {
        // 1. Verificar si el usuario ya existe en Vercel KV
        const existingUser = await kv.get(`user:${email}`);
        if (existingUser) {
            return res.status(409).json({ error: 'Este correo ya está registrado' });
        }

        // 2. Hashear la contraseña de forma segura
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Generar un token de sesión simple
        const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

        // 4. Crear el objeto de usuario
        const userData = {
            email,
            name,
            username: '@' + name.toLowerCase().replace(/\s/g, ''),
            password: hashedPassword,
            createdAt: Date.now()
        };

        // 5. Guardar en Vercel KV
        // user:email -> Datos del usuario
        await kv.set(`user:${email}`, JSON.stringify(userData));
        // session:token -> Email (para saber quién hace las peticiones)
        await kv.set(`session:${token}`, email);

        return res.status(201).json({
            token,
            userId: email,
            user: { name, email }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}