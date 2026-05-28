import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Faltan email o contraseña' });
    }

    try {
        // 1. Buscar el usuario en Vercel KV
        const userDataString = await kv.get(`user:${email}`);
        if (!userDataString) {
            return res.status(401).json({ error: 'No existe una cuenta con este correo' });
        }

        const userData = JSON.parse(userDataString);

        // 2. Comparar la contraseña enviada con el hash guardado
        const isMatch = await bcrypt.compare(password, userData.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // 3. Generar nuevo token de sesión
        const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        await kv.set(`session:${token}`, email);

        return res.status(200).json({
            token,
            userId: email,
            user: { name: userData.name, email: userData.email }
        });

    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}