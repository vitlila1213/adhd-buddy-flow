import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category_id, category_name, user_id } = await req.json();
    if (!category_id || !category_name || !user_id) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch uncategorized tasks for this user
    const { data: tasks, error: fetchErr } = await supabase
      .from("itens_cerebro")
      .select("id, titulo, descricao")
      .eq("user_id", user_id)
      .is("categoria_id", null)
      .eq("tipo", "tarefa");

    if (fetchErr) throw fetchErr;
    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ moved: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to determine which tasks belong to this category
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const taskList = tasks.map((t, i) => `${i}. "${t.titulo}"${t.descricao ? ` (${t.descricao})` : ""}`).join("\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Você é um classificador de tarefas. Dada uma categoria e uma lista de tarefas, retorne APENAS os índices das tarefas que REALMENTE pertencem à categoria.

REGRAS CRÍTICAS:
- A tarefa deve ter relação SEMÂNTICA clara com a categoria, não apenas conter palavras parecidas
- "pagar net" NÃO pertence à categoria "meu filho" — net é internet, não tem relação com filho
- "levar filho no médico" SIM pertence à categoria "meu filho"
- "pagar escola do filho" SIM pertence à categoria "meu filho"
- "comprar presente pro filho" SIM pertence à categoria "meu filho"
- Seja CONSERVADOR: na dúvida, NÃO inclua a tarefa
- Considere sinônimos e contexto brasileiro (neném, bebê, criança = filho/filha)`,
          },
          {
            role: "user",
            content: `Categoria: "${category_name}"

Tarefas sem categoria:
${taskList}

Responda APENAS com os índices separados por vírgula das tarefas que pertencem a "${category_name}". Se nenhuma pertencer, responda "NENHUMA".`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status, await aiResponse.text());
      return new Response(JSON.stringify({ moved: 0, error: "AI unavailable" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content?.trim() || "NENHUMA";

    console.log(`AI response for category "${category_name}":`, answer);

    if (answer === "NENHUMA" || !answer) {
      return new Response(JSON.stringify({ moved: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse indices
    const indices = answer
      .replace(/[^0-9,]/g, "")
      .split(",")
      .map((s: string) => parseInt(s.trim(), 10))
      .filter((n: number) => !isNaN(n) && n >= 0 && n < tasks.length);

    if (indices.length === 0) {
      return new Response(JSON.stringify({ moved: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const idsToUpdate = indices.map((i: number) => tasks[i].id);

    const { error: updateErr } = await supabase
      .from("itens_cerebro")
      .update({ categoria_id: category_id })
      .in("id", idsToUpdate);

    if (updateErr) throw updateErr;

    console.log(`✅ Moved ${idsToUpdate.length} tasks to category "${category_name}"`);

    return new Response(JSON.stringify({ moved: idsToUpdate.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-categorize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
