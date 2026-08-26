"use server"

import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/cache"
import { ClickAstra, ClickAstraInsert, ClickAstraTemplate, ClickAstraTemplateInsert } from "@/types/database"

// Get all Click Astra records for the client
export async function getClickAstraRecords(): Promise<{
  success: boolean
  records: ClickAstra[]
  error?: string
}> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, records: [], error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("click_astra")
      .select("*")
      .eq("client_id", client.client_id)
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, records: [], error: error.message }
    }

    return { success: true, records: data || [] }
  } catch (err) {
    return { success: false, records: [], error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// Create a new Click Astra record
export async function createClickAstraRecord(
  input: Omit<ClickAstraInsert, "client_id">
): Promise<{
  success: boolean
  record?: ClickAstra
  error?: string
}> {
  try {
    // Use cached auth context for faster auth resolution
    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Not authenticated or client profile not found" }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("click_astra")
      .insert({
        ...input,
        client_id: client.client_id,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, record: data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// Update Click Astra record with OCR and AI response
export async function updateClickAstraRecord(
  id: string,
  updates: {
    ocr_extracted_data?: Record<string, unknown>
    ai_response?: Record<string, unknown>
    processing_status?: "pending" | "processing" | "completed" | "failed" | "verified"
    error_message?: string | null
  }
): Promise<{
  success: boolean
  record?: ClickAstra
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found" }
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("click_astra")
      .select("client_id")
      .eq("id", id)
      .single()

    if (!existing || existing.client_id !== client.client_id) {
      return { success: false, error: "Record not found or access denied" }
    }

    const { data, error } = await supabase
      .from("click_astra")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, record: data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// Get a single Click Astra record by ID
export async function getClickAstraRecordById(id: string): Promise<{
  success: boolean
  record?: ClickAstra
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found" }
    }

    const { data, error } = await supabase
      .from("click_astra")
      .select("*")
      .eq("id", id)
      .eq("client_id", client.client_id)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, record: data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// Delete a Click Astra record
export async function deleteClickAstraRecord(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found" }
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("click_astra")
      .select("client_id, image_url")
      .eq("id", id)
      .single()

    if (!existing || existing.client_id !== client.client_id) {
      return { success: false, error: "Record not found or access denied" }
    }

    // Delete the image from storage if it exists
    if (existing.image_url) {
      const path = existing.image_url.split("/click-astra-images/")[1]
      if (path) {
        await supabase.storage.from("click-astra-images").remove([path])
      }
    }

    const { error } = await supabase
      .from("click_astra")
      .delete()
      .eq("id", id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// Process image with OCR - calls backend API
export async function processClickAstraOCR(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found" }
    }

    // Get the record
    const { data: record, error: fetchError } = await supabase
      .from("click_astra")
      .select("*")
      .eq("id", id)
      .eq("client_id", client.client_id)
      .single()

    if (fetchError || !record) {
      return { success: false, error: "Record not found" }
    }

    // Update status to processing
    await supabase
      .from("click_astra")
      .update({ processing_status: "processing" })
      .eq("id", id)

    // Get auth session for backend call
    const { data: session } = await supabase.auth.getSession()
    const accessToken = session?.session?.access_token

    // Call backend API to process OCR
    const backendUrl = process.env.ASK_ASTRA_INTERNAL_URL || process.env.NEXT_PUBLIC_ASK_ASTRA_API_URL || "http://localhost:8000"

    const response = await fetch(`${backendUrl}/api/v1/click-astra/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        record_id: id,
        image_url: record.image_url,
        extraction_columns: record.extraction_columns,
        llm_instructions: record.llm_instructions,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      await supabase
        .from("click_astra")
        .update({
          processing_status: "failed",
          error_message: errorData.detail || "Backend processing failed"
        })
        .eq("id", id)
      return { success: false, error: errorData.detail || "Backend processing failed" }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// Mark record as verified (after human verification)
export async function verifyClickAstraRecord(
  id: string,
  verifiedData: Record<string, unknown>
): Promise<{
  success: boolean
  record?: ClickAstra
  error?: string
}> {
  return updateClickAstraRecord(id, {
    ai_response: verifiedData,
    processing_status: "verified",
  })
}

// Export records to JSON (for Excel conversion on frontend)
export async function exportClickAstraRecords(
  ids?: string[]
): Promise<{
  success: boolean
  data?: Record<string, unknown>[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found" }
    }

    let query = supabase
      .from("click_astra")
      .select("*")
      .eq("client_id", client.client_id)
      .in("processing_status", ["completed", "verified"])
      .order("date", { ascending: false })

    if (ids && ids.length > 0) {
      query = query.in("id", ids)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    // Transform data for export
    const exportData = (data || []).map((record) => ({
      name: record.name,
      image_name: record.image_name,
      date: record.date,
      extraction_columns: record.extraction_columns,
      ai_response: record.ai_response,
      status: record.processing_status,
      created_at: record.created_at,
    }))

    return { success: true, data: exportData }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// =====================================================
// CLICK ASTRA TEMPLATES
// =====================================================

// Get all templates for the client
export async function getClickAstraTemplates(): Promise<{
  success: boolean
  templates: ClickAstraTemplate[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return { success: false, templates: [], error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, templates: [], error: "Client profile not found" }
    }

    const { data, error } = await supabase
      .from("click_astra_templates")
      .select("*")
      .eq("client_id", client.client_id)
      .order("name", { ascending: true })

    if (error) {
      return { success: false, templates: [], error: error.message }
    }

    return { success: true, templates: data || [] }
  } catch (err) {
    return { success: false, templates: [], error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// Create a new template
export async function createClickAstraTemplate(
  input: ClickAstraTemplateInsert
): Promise<{
  success: boolean
  template?: ClickAstraTemplate
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found" }
    }

    // Check for duplicate name
    const { data: existing } = await supabase
      .from("click_astra_templates")
      .select("id")
      .eq("client_id", client.client_id)
      .eq("name", input.name)
      .single()

    if (existing) {
      return { success: false, error: "A template with this name already exists" }
    }

    const { data, error } = await supabase
      .from("click_astra_templates")
      .insert({
        ...input,
        client_id: client.client_id,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, template: data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// Delete a template
export async function deleteClickAstraTemplate(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return { success: false, error: "Not authenticated" }
    }

    const { client } = await getAuthContext()
    if (!client) {
      return { success: false, error: "Client profile not found" }
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("click_astra_templates")
      .select("client_id")
      .eq("id", id)
      .single()

    if (!existing || existing.client_id !== client.client_id) {
      return { success: false, error: "Template not found or access denied" }
    }

    const { error } = await supabase
      .from("click_astra_templates")
      .delete()
      .eq("id", id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
