import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://vnfcxcfriwhhlvrjmyfj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZmN4Y2ZyaXdoaGx2cmpteWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDQxNDUsImV4cCI6MjA4NDA4MDE0NX0.oaw9HkmyPTdD0wr8_HRP1FemP7ju9BwWieP8lvDJqoY"
);
