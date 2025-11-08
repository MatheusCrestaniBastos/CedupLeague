/**
 * Configurações do Supabase
 */

const SUPABASE_URL = 'https://pfgqekfrsfwzmhlkyxem.supabase.co'; // ← SUBSTITUA pela sua URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmZ3Fla2Zyc2Z3em1obGt5eGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTM1ODEsImV4cCI6MjA3ODA2OTU4MX0.nGsMvQeh0T7hiKfikvHu0PAkXrbD9UUqvQySfOgTKxE'; // ← SUBSTITUA pela sua chave

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase inicializado');