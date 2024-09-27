import { AutoTokenizer, env, pipeline } from "@xenova/transformers";

env.allowLocalModels = false;

//Fuzail22/onnx-msmarco-distilbert-cos-v5

// const tokenizer = await AutoTokenizer.from_pretrained(
//   "Fuzail22/onnx-msmarco-distilbert-cos-v5"
// );

// const inputSequenceLength = tokenizer.model_max_length;

// console.log("Input sequence length:", inputSequenceLength);

export const generateVectorEmbeddings = async (text: string) => {
  try {
    let startTime = Date.now();
    console.log("extracting text:", text.split(" ").length, text);
    const extractor = await pipeline(
      "feature-extraction",
      "Fuzail22/onnx-msmarco-distilbert-cos-v5",
      {
        quantized: false
      }
    );
    const output = await extractor(text, {
      pooling: "mean",
      normalize: true
    });
    let endTime = Date.now();
    // console.log("extraction time in seconds:", (endTime - startTime) / 1000);
    // console.log("extraction output:", output.data);
    let arr = output.tolist();
    arr = arr[0].map((value: string) => {
      return value;
    });
    // console.log("extraction output:", Array.isArray(arr));
    return arr;
  } catch (error) {
    console.error("Error during extraction:", error);
    throw error;
  }
};
