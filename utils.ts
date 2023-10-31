import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { OpenAI } from 'langchain/llms/openai'
import { timeout } from './config'
import { PromptTemplate } from 'langchain/prompts'
import { CallbackManager } from 'langchain/callbacks'
import { EmbeddingsParams, Embeddings } from "langchain/embeddings/base";


export const queryPineconeVectorStoreAndQueryLLM = async (
  client,
  indexName,
  question, 
  historyArray=[] // save in state? -> use array 
) => {

  console.log('Querying Pinecone vector store...');

  const index = client.Index(indexName);

  const queryEmbedding = await new OpenAIEmbeddings().embedQuery(question)
  // Query Pinecone index 
  let queryResponse = await index.query({
    queryRequest: {
      topK: 10, // Return top 10 matches
      vector: queryEmbedding,
      includeMetadata: true,
      includeValues: true,
    },
  });
  console.log(`Found ${queryResponse.matches.length} matches...`);
  // TODO: include convesation in the below:
  if (queryResponse.matches.length) {
    const llm = new OpenAI({});
    const prompt = new PromptTemplate({
      inputVariables: ["context", "question"],
      template: `
      The context is from the kneesovertoesguy. You are giving advice to a client using his teachings. 
      Use only non technical human anatomy knowledge and terms and the information in the context to answer the question. The client cannot see the context, therefore make your answer complete. Include only relevant info, if they want to strengthen the elbow, only include exercises to strengthen and improve mobility around the elbow. 
      Context: {context}
      Question: {question}
      If you cannot find the answer from the info in the context, DO NOT MAKE UP AN ANSWER. 
      However, in this case, you may answer the closest related question possible using the context.
  `,
    });
    // @ts-ignore
    historyArray.push({"source": "user", "message": question})
    // TODO: last 10 entries
    if (historyArray.length > 10) {
      historyArray = historyArray.slice(-10)
    }
    
    let historyString = historyArray.join('')

    // Extract and concatenate page content from matched documents
    const concatenatedPageContent = queryResponse.matches//[0].metadata.text
    .map((match) => match.metadata.text)
    .join(" ");

    const formattedPrompt = await prompt.format({
      context: historyString + concatenatedPageContent,
      question: question,
    });
    console.log(formattedPrompt)

    const result = await llm.call(
      formattedPrompt
    );
    // @ts-ignore
    historyArray.push({"source": "agent", "message": result})


    console.log(`Answer: ${result}`);

    return [historyArray, result]
  } else {

    console.log('Since there are no matches, GPT-3 will not be queried.');
  }
};
export const createPineconeIndex = async (
  client,
  indexName,
  vectorDimension
) => {

  console.log(`Checking "${indexName}"...`);

  const existingIndexes = await client.listIndexes();

  if (!existingIndexes.includes(indexName)) {

    console.log(`Creating "${indexName}"...`);

    await client.createIndex({
      createRequest: {
        name: indexName,
        dimension: vectorDimension,
        metric: 'cosine',
      },
    });

      console.log(`Creating index.... please wait for it to finish initializing.`);

    await new Promise((resolve) => setTimeout(resolve, timeout));
  } else {

    console.log(`"${indexName}" already exists.`);
  }
};


export const updatePinecone = async (client, indexName, docs) => {
  console.log('Retrieving Pinecone index...');
  const index = client.Index(indexName);
  console.log(`Pinecone index retrieved: ${indexName}`);
  for (const doc of docs) {
    console.log(`Processing document: ${doc.metadata.source}`);
    const txtPath = doc.metadata.source;
    const text = doc.pageContent;
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
    });
    console.log('Splitting text into chunks...');
    const chunks = await textSplitter.createDocuments([text]);
    console.log(`Text split into ${chunks.length} chunks`);
    console.log(
      `Calling OpenAI's Embedding endpoint documents with ${chunks.length} text chunks ...`
    );
    const embeddingsArrays = await new OpenAIEmbeddings().embedDocuments(
      chunks.map((chunk) => chunk.pageContent.replace(/\n/g, " "))
    );
    console.log('Finished embedding documents');
    console.log(
      `Creating ${chunks.length} vectors array with id, values, and metadata...`
    );
    const batchSize = 100;
    let batch:any = [];
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx];
      const vector = {
        id: `${txtPath}_${idx}`,
        values: embeddingsArrays[idx],
        metadata: {
          ...chunk.metadata,
          loc: JSON.stringify(chunk.metadata.loc),
          pageContent: chunk.pageContent,
          txtPath: txtPath,
        },
      };
      batch = [...batch, vector]
      if (batch.length === batchSize || idx === chunks.length - 1) {
        await index.upsert({
          upsertRequest: {
            vectors: batch,
          },
        });
        batch = [];
      }
    }
    console.log(`Pinecone index updated with ${chunks.length} vectors`);
  }
};