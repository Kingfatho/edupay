import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://cdabzfewexxswokbekeo.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkYWJ6ZmV3ZXh4c3dva2Jla2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0ODQ4MDcsImV4cCI6MjEwNzA2MDgwN30.o5HtXGI1vyXD2fRZHdhX-AItvEb530MAtb1JagbtJxI"

export const supabase = createClient(supabaseUrl, supabaseKey)