import { NextRequest, NextResponse } from 'next/server'
import { PineconeClient } from '@pinecone-database/pinecone'
import {
  queryPineconeVectorStoreAndQueryLLM,
} from '../../../utils'
import { indexName } from '../../../config'

// TODO: allow conversations
// add langchain docs to vector db - can be local one
export async function POST(req: NextRequest) {
  const { history, query } = await req.json()
  const client = new PineconeClient()
  await client.init({
    apiKey: process.env.PINECONE_API_KEY || '',
    environment: process.env.PINECONE_ENVIRONMENT || ''
  })
  // @ts-ignore
  const [historyArray, text] = await queryPineconeVectorStoreAndQueryLLM(client, indexName, query, history)
  console.log("historyArray: ", historyArray[0], historyArray[1])
  return NextResponse.json({
    data: text,
    history: historyArray // use on clientside
  })
}