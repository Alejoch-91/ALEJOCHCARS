require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const fileUpload = require('express-fileupload');

const app = express();
app.use(express.json());
app.use(express.static('public')); 
app.use(fileUpload()); 

// Conexión oficial
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 1. OBTENER AUTOS (Público - Solo aprobados)
app.get('/api/autos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('vehiculos')
            .select('*')
            .eq('estado', 'aprobado') 
            .order('es_vip', { ascending: false })
            .order('creado_en', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 2. OBTENER UN SOLO AUTO POR ID
app.get('/api/autos/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('vehiculos')
            .select('*')
            .eq('id', req.params.id)
            .single();
            
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(404).json({ error: 'Vehículo no encontrado' });
    }
});

// 3. PUBLICAR AUTO (Ahora vincula al usuario)
app.post('/api/autos', async (req, res) => {
    try {
        let publicUrl = "";

        // Subida de imagen
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

        // Construcción del objeto de datos
        const vehiculoData = {
            marca: req.body.marca,
            modelo: req.body.modelo,
            ano: req.body.ano ? parseInt(req.body.ano) : null,
            precio: req.body.precio ? parseFloat(req.body.precio) : null,
            kilometraje: req.body.kilometraje ? parseInt(req.body.kilometraje) : null,
            ciudad: req.body.ciudad,
            contacto: req.body.contacto,
            descripcion: req.body.descripcion,
            es_vip: req.body.es_vip === 'true',
            imagen_url: publicUrl,
            estado: 'pendiente', // Siempre pendiente para revisión
            user_id: req.body.user_id // <-- VINCULACIÓN: Aquí se guarda quién lo publicó
        };

        const { data, error } = await supabase.from('vehiculos').insert([vehiculoData]).select();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Motor de Alejoch Cars activo en el puerto ${PORT}`));