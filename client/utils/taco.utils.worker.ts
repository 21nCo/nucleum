import { AutoTokenizer, env, pipeline } from "@xenova/transformers";
import type { TranscriptionModel } from "../types/taco.types";
import { TacoActions } from "../types/taco.types";

env.allowLocalModels = false;
let call = 0;
onmessage = (e: any) => {
  call++;
  console.log("ts worker file", call, e.data);
  // postMessage(e.data);
  let action: TacoActions = e.data.action;

  switch (action) {
    case TacoActions.INITIALIZE_TRANSCRIBER:
      Transcriber.initAll();
      break;
    case TacoActions.RESET_TRANSCRIBER:
      Transcriber.built = false;
      break;
    case TacoActions.GET_TRANSCRIPTION:
      Transcriber.transcribe(e.data.params.audioUrl, e.data.params.model);
      break;
    case TacoActions.INITIAlIZE_FEATURE_EXTRACTOR:
      FeatureExtractor.init();
      break;
    case TacoActions.RESET_FEATURE_EXTRACTOR:
      FeatureExtractor.built = false;
      break;
    case TacoActions.GET_EMBEDDINGS:
      FeatureExtractor.generateVectorEmbeddings(e.data.params.text);
      break;
    case TacoActions.INITIALIZE_QUESTION_ANSWERER:
      QuestionAnswerer.init();
      break;
    case TacoActions.RESET_QUESTION_ANSWERER:
      QuestionAnswerer.built = false;
      break;
    case TacoActions.GET_ANSWER:
      QuestionAnswerer.getAnswer(e.data.params.question, e.data.params.context);
      break;
    case TacoActions.INITIALIZE_TEXT2TEXT_GENERATOR:
      Text2textGenerator.init();
      break;

    case TacoActions.RESET_TEXT2TEXT_GENERATOR:
      Text2textGenerator.built = false;
      break;
    case TacoActions.GENERATE_TEXT:
      Text2textGenerator.generateText(e.data.params.text);
      break;
  }
};

env.allowLocalModels = false;

// const tokenizer = await AutoTokenizer.from_pretrained(
//   "Fuzail22/onnx-msmarco-distilbert-cos-v5"
// );
// const inputSequenceLength = tokenizer.model_max_length;
// postMessage("Input sequence length:", inputSequenceLength);

/**
 * Using Class for initializing the pipline only once, which was required to avoid range out of bounds error propbably causes due to more initializations of the pipeline.
 */
class FeatureExtractor {
  static built = false;
  static extractor: any;
  static async init() {
    if (!FeatureExtractor.built) {
      // postMessage("initializing feature extractor");
      FeatureExtractor.extractor = await pipeline(
        "feature-extraction",
        "Fuzail22/onnx-msmarco-distilbert-cos-v5",
        {
          quantized: false,
          progress_callback: (progress: any) => {
            postMessage(progress);
          }
        }
      );
      FeatureExtractor.built = true;
    }
  }

  static async generateVectorEmbeddings(text: string) {
    try {
      // postMessage("extracting text:", text.split(" ").length, text);
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
      // postMessage("extraction time in seconds:", (endTime - startTime) / 1000);
      postMessage(arr);
      // return arr;
    } catch (error) {
      console.error("Error during extraction:", error);
      throw error;
    }
  }
}

class QuestionAnswerer {
  static built = false;
  static qa: any;
  static async init() {
    if (!QuestionAnswerer.built) {
      QuestionAnswerer.qa = await pipeline(
        "question-answering",
        "Fuzail22/onnx-roberta-base-squad2",
        {
          quantized: false,
          progress_callback: (progress: any) => {
            postMessage(progress);
          }
        }
      );
      QuestionAnswerer.built = true;
    }
  }

  static async getAnswer(question: string, context: string) {
    try {
      const startTime = Date.now();
      if (!QuestionAnswerer.built) await QuestionAnswerer.init();
      const output = await QuestionAnswerer.qa(question, context, {
        top_k: 1,
        top_p: 0.9,
        max_seq_length: 512,
        temperature: 0.5,
        do_sample: true,
        num_return_sequences: 1,
        return_full_text: true
      });
      const endTime = Date.now();
      // postMessage("answering time in seconds:", (endTime - startTime) / 1000);
      // postMessage("output FOR qa", output);
      postMessage(output.answer);
      // return output.answer;
    } catch (error) {
      console.error("Error during extraction:", error);
      throw error;
    }
  }
}

class Text2textGenerator {
  static built = false;
  static generator: any;
  static async init() {
    if (!Text2textGenerator.built) {
      Text2textGenerator.generator = await pipeline(
        "text2text-generation",
        "Xenova/LaMini-Flan-T5-783M",
        {
          quantized: true
        }
      );
      Text2textGenerator.built = true;
    }
  }
  static async generateText(text: string) {
    try {
      if (!Text2textGenerator.built) await Text2textGenerator.init();
      const output = await Text2textGenerator.generator(text, {
        max_length: 100,
        temperature: 0.5,
        do_sample: true,
        num_return_sequences: 1,
        return_full_text: true
      });
      postMessage("output FOR T2T", output.generated_text);
      postMessage(output.generated_text);
      // return output.generated_text;
    } catch (error) {
      console.error("Error during extraction:", error);
      throw error;
    }
  }
}

class Transcriber {
  static built = false;
  static transcriber: any;
  static models = [
    "Xenova/whisper-tiny.en",
    "Xenova/whisper-small.en",
    "Xenova/whisper-base.en"
    // "Xenova/whisper-medium.en"
  ];
  static model = this.models[0];
  static async initAll() {
    for (let model of this.models) {
      Transcriber.built = false;
      this.model = model;
      this.init();
    }
  }
  static async init() {
    if (!Transcriber.built) {
      Transcriber.transcriber = await pipeline(
        "automatic-speech-recognition",
        this.model,
        {
          progress_callback: (progress: any) => {
            postMessage(progress);
          }
        }
      );
      Transcriber.built = true;
    }
  }

  static async transcribe(audioUrl: string, model: TranscriptionModel) {
    try {
      if (this.model != model && this.built) {
        const index = this.models.findIndex((model) => model.includes(model));
        if (index >= 0) {
          this.model = this.models[index];
          this.built = false;
          delete Transcriber.transcriber;
        }
      }
      if (!Transcriber.built) await Transcriber.init();
      const output = await Transcriber.transcriber(
        audioUrl
        // {return_timestamps: true }
      );
      // postMessage("output FOR transcriber", output);
      postMessage(output.text);
      // return output.text;
    } catch (error) {
      console.error("Error during extraction:", error);
      throw error;
    }
  }
}
