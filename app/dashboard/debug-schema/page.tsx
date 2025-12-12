'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function DebugSchemaPage() {
  const [schemaInfo, setSchemaInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkSchema() {
      try {
        // 1. Try to inspect a single row to see what keys return
        const { data: workerData, error: workerError } = await supabase
          .from('workers')
          .select('*')
          .limit(1)

        // 2. Try to get column info (requires SQL permissions usually, but try this RPC workaround if you have one)
        // If not, we just show the structure of the returned data which tells us what the API "sees"
        
        setSchemaInfo({
          workers_table_sample: workerData ? workerData[0] : 'No rows found',
          error: workerError
        })

      } catch (err: any) {
        setError(err.message)
      }
    }

    checkSchema()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Schema Debugger</h1>
      
      {error && <div className="bg-red-100 p-4 text-red-700 mb-4">{error}</div>}
      
      <div className="bg-gray-100 p-4 rounded overflow-auto font-mono text-sm h-96">
        <pre>{JSON.stringify(schemaInfo, null, 2)}</pre>
      </div>
      
      <p className="mt-4 text-gray-600">
        Copy the JSON above and paste it into the chat. 
        Note: If "workers_table_sample" shows keys, those are the ONLY columns Supabase API can see currently.
      </p>
    </div>
  )
}
