//TODO-Remove this file late if not required
// import { AutoTokenizer, env, pipeline } from "@xenova/transformers";
// import type { TranscriptionModel } from "../types/taco.types";

// env.allowLocalModels = false;

// // const tokenizer = await AutoTokenizer.from_pretrained(
// //   "Fuzail22/onnx-msmarco-distilbert-cos-v5"
// // );
// // const inputSequenceLength = tokenizer.model_max_length;
// // console.log("Input sequence length:", inputSequenceLength);

// /**
//  * Using Class for initializing the pipline only once, which was required to avoid range out of bounds error propbably causes due to more initializations of the pipeline.
//  */
// export class FeatureExtractor {
//   static built = false;
//   static extractor: any;
//   static async init() {
//     if (!FeatureExtractor.built) {
//       // console.log("initializing feature extractor");
//       FeatureExtractor.extractor = await pipeline(
//         "feature-extraction",
//         "Fuzail22/onnx-msmarco-distilbert-cos-v5",
//         {
//           quantized: false,
//           progress_callback: (progress: any) => {
//             console.log("Feature Extractor Initialization progress", progress);
//           }
//         }
//       );
//       FeatureExtractor.built = true;
//     }
//   }

//   static async generateVectorEmbeddings(text: string) {
//     try {
//       // console.log("extracting text:", text.split(" ").length, text);
//       // let startTime = Date.now();
//       if (!FeatureExtractor.built) await FeatureExtractor.init();
//       const output = await FeatureExtractor.extractor(text, {
//         pooling: "mean",
//         normalize: true
//       });
//       let arr = output.tolist();
//       arr = arr[0].map((value: string) => {
//         return value;
//       });
//       // let endTime = Date.now();
//       // console.log("extraction time in seconds:", (endTime - startTime) / 1000);
//       return arr;
//     } catch (error) {
//       console.error("Error during extraction:", error);
//       throw error;
//     }
//   }
// }

// export class QuestionAnswerer {
//   static built = false;
//   static qa: any;
//   static async init() {
//     if (!QuestionAnswerer.built) {
//       QuestionAnswerer.qa = await pipeline(
//         "question-answering",
//         "Fuzail22/onnx-roberta-base-squad2",
//         {
//           quantized: false,
//           progress_callback: (progress: any) => {
//             console.log("Question Answerer Initialization progress", progress);
//           }
//         }
//       );
//       QuestionAnswerer.built = true;
//     }
//   }

//   static async getAnswer(question: string, context: string) {
//     try {
//       const startTime = Date.now();
//       if (!QuestionAnswerer.built) await QuestionAnswerer.init();
//       const output = await QuestionAnswerer.qa(question, context, {
//         top_k: 1,
//         top_p: 0.9,
//         max_seq_length: 512,
//         temperature: 0.5,
//         do_sample: true,
//         num_return_sequences: 1,
//         return_full_text: true
//       });
//       const endTime = Date.now();
//       // console.log("answering time in seconds:", (endTime - startTime) / 1000);
//       // console.log("output FOR qa", output);
//       return output.answer;
//     } catch (error) {
//       console.error("Error during extraction:", error);
//       throw error;
//     }
//   }
// }

// export class Text2textGenerator {
//   static built = false;
//   static generator: any;
//   static async init() {
//     if (!Text2textGenerator.built) {
//       Text2textGenerator.generator = await pipeline(
//         "text2text-generation",
//         "Xenova/LaMini-Flan-T5-783M",
//         {
//           quantized: true
//         }
//       );
//       Text2textGenerator.built = true;
//     }
//   }
//   static async generateText(text: string) {
//     try {
//       console.log("extracting text:", text.split(" ").length, text);
//       if (!Text2textGenerator.built) await Text2textGenerator.init();
//       const output = await Text2textGenerator.generator(text, {
//         max_length: 100,
//         temperature: 0.5,
//         do_sample: true,
//         num_return_sequences: 1,
//         return_full_text: true
//       });
//       console.log("output FOR T2T", output.generated_text);
//       return output.generated_text;
//     } catch (error) {
//       console.error("Error during extraction:", error);
//       throw error;
//     }
//   }
// }

// export class Transcriber {
//   static built = false;
//   static transcriber: any;
//   static models = [
//     "Xenova/whisper-tiny.en",
//     "Xenova/whisper-small.en",
//     "Xenova/whisper-base.en",
//     "Xenova/whisper-medium.en"
//   ];
//   static model = this.models[0];
//   static async init() {
//     if (!Transcriber.built) {
//       Transcriber.transcriber = await pipeline(
//         "automatic-speech-recognition",
//         this.model,
//         {
//           progress_callback: (progress: any) => {
//             console.log("Transcriber Initialization progress", progress);
//           }
//         }
//       );
//       Transcriber.built = true;
//     }
//   }

//   static async transcribe(audioUrl: string, model: TranscriptionModel) {
//     try {
//       if (this.model != model && this.built) {
//         const index = this.models.findIndex((model) => model.includes(model));
//         if (index >= 0) {
//           this.model = this.models[index];
//           this.built = false;
//           delete Transcriber.transcriber;
//         }
//       }
//       if (!Transcriber.built) await Transcriber.init();
//       const startTime = Date.now();
//       const output = await Transcriber.transcriber(
//         audioUrl
//         // {return_timestamps: true }
//       );
//       const endTime = Date.now();
//       console.log(
//         "Transcriber time",
//         (endTime - startTime) / 1000,
//         "secs ",
//         output
//       );
//       // console.log("output FOR transcriber", output);
//       return output.text;
//     } catch (error) {
//       console.error("Error during extraction:", error);
//       throw error;
//     }
//   }
// }
