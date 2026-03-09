require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const fileUpload = require('express-fileupload');

const app = express();
app.use(express.json());
app.use(express.static('public')); // Servir archivos estáticos
app.use(fileUpload()); // Para recibir las fotos

// Conexión oficial a TU Supabase de Alejoch
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 1. OBTENER AUTOS (Solo los aprobados para el feed público)
app.get('/api/autos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('vehiculos')
            .select('*')
            .eq('estado', 'aprobado') // <-- FILTRO CLAVE: Solo muestra los aprobados
            .order('es_vip', { ascending: false })
            .order('creado_en', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// NUEVO: Obtener un solo auto por su ID para la página de detalles
app.get('/api/autos/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('vehiculos')
            .select('*')
            .eq('id', req.params.id)
            .single(); // Trae un solo objeto
            
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(404).json({ error: 'Vehículo no encontrado' });
    }
});

// 2. PUBLICAR AUTO (Fuerza el estado a 'pendiente')
app.post('/api/autos', async (req, res) => {
    try {
        let publicUrl = "";

        if (req.files && req.files.foto) {
            const file = req.files.foto;
            const fileName = `alejoch-${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
            
            const { error: uploadError } = await supabase.storage
                .from('fotos-autos')
                .upload(fileName, file.data, { contentType: file.mimetype });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('fotos-autos')
                .getPublicUrl(fileName);
            
            publicUrl = urlData.publicUrl;
        }

        const vehiculoData = {
            ...req.body,
            ano: req.body.ano ? parseInt(req.body.ano) : null,
            precio: req.body.precio ? parseFloat(req.body.precio) : null,
            kilometraje: req.body.kilometraje ? parseInt(req.body.kilometraje) : null,
            es_vip: req.body.es_vip === 'true',
            imagen_url: publicUrl,
            estado: 'pendiente' // <-- SEGURIDAD: Nadie puede publicar directo, siempre queda pendiente
        };

        const { data, error } = await supabase.from('vehiculos').insert([vehiculoData]).select();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Motor de Alejoch Cars en http://localhost:${PORT}`));