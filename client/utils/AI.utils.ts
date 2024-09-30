import { AutoTokenizer, env, pipeline } from "@xenova/transformers";

env.allowLocalModels = false;

// const tokenizer = await AutoTokenizer.from_pretrained(
//   "Fuzail22/onnx-msmarco-distilbert-cos-v5"
// );
// const inputSequenceLength = tokenizer.model_max_length;
// console.log("Input sequence length:", inputSequenceLength);

/**
 * Using Class for restricting initializing the pipline only once, which was required to avoid range out of bounds error propbably causes due to more initializations of the pipeline.
 */
export class FeatureExtractor {
  static built = false;
  static extractor: any;
  static async init() {
    if (!FeatureExtractor.built) {
      // console.log("initializing feature extractor");
      FeatureExtractor.extractor = await pipeline(
        "feature-extraction",
        "Fuzail22/onnx-msmarco-distilbert-cos-v5",
        {
          quantized: false,
          progress_callback: (progress: any) => {
            console.log("Feature Extractor Initialization progress", progress);
          }
        }
      );
      FeatureExtractor.built = true;
    }
  }

  static async generateVectorEmbeddings(text: string) {
    try {
      // console.log("extracting text:", text.split(" ").length, text);
      // let startTime = Date.now();
      if (!FeatureExtractor.built) await FeatureExtractor.init();
      const output = await FeatureExtractor.extractor(text, {
        pooling: "mean",
        normalize: true
      });
      let arr = output.tolist();
      arr = arr[0].map((value: string) => {
        return value;
      });
      // let endTime = Date.now();
      // console.log("extraction time in seconds:", (endTime - startTime) / 1000);
      return arr;
    } catch (error) {
      console.error("Error during extraction:", error);
      throw error;
    }
  }
}
