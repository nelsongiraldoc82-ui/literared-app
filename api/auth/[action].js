import { kv } from '@vercel/kv';

// Middleware para verificar quién hace la petición usando el token
async function authenticate(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    
    // Busca a qué email pertenece ese token
    const email = await kv.get(`session:${token}`);
    return email;
}

export default async function handler(req, res) {
    // 1. Verificar autenticación
    const userEmail = await authenticate(req);
    if (!userEmail) {
        return res.status(401).json({ error: 'No autorizado. Token inválido.' });
    }

    // 2. Extraer la acción de la URL (push o pull)
    const { action } = req.query;

    try {
        if (action === 'push' && req.method === 'POST') {
            // ===== GUARDAR DATOS EN EL SERVIDOR =====
            const payload = req.body;
            
            if (!payload || !payload.timestamp) {
                return res.status(400).json({ error: 'Payload inválido' });
            }

            // Guardar los datos bajo la clave del usuario
            await kv.set(`data:${userEmail}`, JSON.stringify(payload));
            
            return res.status(200).json({ success: true, message: 'Datos sincronizados' });

        } else if (action === 'pull' && req.method === 'GET') {
            // ===== DESCARGAR DATOS DEL SERVIDOR =====
            const dataString = await kv.get(`data:${userEmail}`);
            
            if (!dataString) {
                // Si es un usuario nuevo, devolver estructura vacía
                return res.status(200).json({
                    profile: null,
                    posts: [],
                    sharedBooks: [],
                    readingNotes: [],
                    settings: { isDark: false },
                    timestamp: 0
                });
            }

            const data = JSON.parse(dataString);
            return res.status(200).json(data);

        } else {
            return res.status(400).json({ error: `Acción no válida: ${action}` });
        }
    } catch (error) {
        console.error(`Error en sync/${action}:`, error);
        return res.status(500).json({ error: 'Error interno durante la sincronización' });
    }
}