'use client'
import { useRef, useState } from 'react'

export default function Home() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const textAreaRef = useRef(null);
  async function createIndexAndEmbeddings() {
    try {
      const result = await fetch('/api/setup', {
        method: "POST"
      })
      const json = await result.json()
      console.log('result: ', json)
    } catch (err) {
      console.log('err:', err)
    }
  }
  async function sendQuery() {
    if (!query) return
    setResult('')
    setLoading(true)
    try {
      const result = await fetch('/api/read', {
        method: "POST",
        body: JSON.stringify({history, query})
      })
      const json = await result.json()
      setResult(json.data)
      setHistory(json.history)
      setLoading(false)
      setQuery('')
      // textAreaRef.current.focus()
      // textAreaRef.current = ''

      console.log("full history: ", json.history)
    } catch (err) {
      console.log('err:', err)
      setLoading(false)
    }
  }
  return (
    // TODO: move input to bottom
    // have whatsapp style message boxes
    <main className="flex flex-col items-center justify-between">
      <div className="min-h-screen bg-gray-400 overflow-y-auto">
        {
          history.map((item, index) => {
            console.log('item:', item)
            return (<div 
              className={`
              rounded-xl bg-white px-1 mx-5 mb-3 shadow-lg shadow-gray-600 max-w-[80%] 
              ${item.source === 'user' ? 'ml-auto' : 'mr-auto'}
            `}
              key={index}>{item.message}</div>)
          })
        }
        {
          loading && <p>Asking AI ...</p>
        }

      </div>
        <div className="flex flex-col items-center justify-center bg-gradient-to-t from-gray-600 via-gray-400 to-gray-600 p-4 fixed bottom-4 w-full">
          <textarea className='text-black py-1 max-w-[80%] center' cols={40} onChange={e => setQuery(e.target.value)}/>
          <button className="px-7 py-1 rounded-2xl bg-white text-black mt-2 mb-2 max-w-[80%]" onClick={sendQuery}>Ask AI</button>
        </div>

    </main>
  )
}
