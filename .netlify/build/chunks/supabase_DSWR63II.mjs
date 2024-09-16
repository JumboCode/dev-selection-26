import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://mzbyvgzmddzqbrvyserw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16Ynl2Z3ptZGR6cWJydnlzZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTEzMTE0MTQsImV4cCI6MjAyNjg4NzQxNH0.DzAXRT7VLC8_BsxDCU1OWw6_Iylkgbj90Yh5pnq0MOs",
  {
    auth: {
      flowType: "pkce"
    }
  }
);

export { supabase as s };
