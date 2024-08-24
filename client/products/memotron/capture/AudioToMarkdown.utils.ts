import { prefixTable } from "$lib/shared/utils/text.utils";
import { generateUID } from "$lib/client/utils/utils";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";

interface Block {
  id?: string;
  contentType?: string;
  body?: string;
  listType?: string;
  children?: Block[];
}

class AudioToMarkdown {
  words: string[] | undefined;
  word: string | undefined;
  stopKeywords = [
    "H1stop",
    "H2stop",
    "H3stop",
    "H4stop",
    "H5stop",
    "H6stop",
    "OLstop",
    "OLchildstop",
    "OLsubchildstop",
    "OLsubsubchildstop",
    "ULstop",
    "ULchildstop",
    "ULsubchildstop",
    "ULsubsubchildstop",
    "olstop",
    "olchildstop",
    "olsubchildstop",
    "olsubsubchildstop",
    "ulstop",
    "ulchildstop",
    "ulsubchildstop",
    "ulsubsubchildstop",
    "blankstop"
  ];
  keywords = [
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "italic",
    "bold",
    "italicstop",
    "boldstop",
    "OL",
    "OLchild",
    "OLsubchild",
    "OLsubsubchild",
    "UL",
    "ULchild",
    "ULsubchild",
    "ULsubsubchild",
    "ol",
    "olchild",
    "olsubchild",
    "olsubsubchild",
    "ul",
    "ulchild",
    "ulsubchild",
    "ulsubsubchild",
    ...this.stopKeywords
  ];
  blocks: Block[] = [];
  defaultBlock: Block = { body: "", contentType: "SIMPLE_TEXT" };
  defaultListBlockValues: Block = {
    body: "",
    contentType: "LIST",
    children: []
  };
  lastCreatedOL: any = {};
  lastCreatedOLC: any = {};
  lastCreatedOLSC: any = {};
  lastCreatedUL: any = {};
  lastCreatedULC: any = {};
  lastCreatedULSC: any = {};
  lastCreatedListVariantV1:
    | "OL"
    | "UL"
    | "OLC"
    | "ULC"
    | "OLSC"
    | "ULSC"
    | "OLSSC"
    | "ULSSC"
    | null = null;

  lastCreatedOLchild: any = {};
  lastCreatedOLsubchild: any = {};
  lastCreatedULchild: any = {};
  lastCreatedULsubchild: any = {};
  lastCreatedListVariantV2:
    | "OL"
    | "UL"
    | "OLchild"
    | "OLsubchild"
    | "OLsubsubchild"
    | "ULchild"
    | "ULsubchild"
    | "ULsubsubchild"
    | "ol"
    | "ul"
    | "olchild"
    | "olsubchild"
    | "olsubsubchild"
    | "ulchild"
    | "ulsubchild"
    | "ulsubsubchild"
    | null = null;
  currentBlock = { ...this.defaultBlock };

  resetInitialStatesV1() {
    this.lastCreatedOL = {};
    this.lastCreatedOLC = {};
    this.lastCreatedOLSC = {};
    this.lastCreatedUL = {};
    this.lastCreatedULC = {};
    this.lastCreatedULSC = {};
    this.lastCreatedListVariantV1 = null;
    this.currentBlock = { ...this.defaultBlock };
    this.blocks = [];
  }

  resetInitialStatesV2() {
    this.lastCreatedOL = {};
    this.lastCreatedUL = {};
    this.lastCreatedOLchild = {};
    this.lastCreatedOLsubchild = {};
    this.lastCreatedULchild = {};
    this.lastCreatedULsubchild = {};
    this.lastCreatedListVariantV2 = null;
    this.currentBlock = { ...this.defaultBlock };
    this.blocks = [];
  }
  pushCurrentBlockToBlocksV1() {
    if (this.currentBlock.body && this.currentBlock.body.length > 0) {
      if (this.currentBlock.contentType === "LIST") {
        switch (this.lastCreatedListVariantV1) {
          case "OL":
            this.blocks.push(this.lastCreatedOL);
            break;
          case "UL":
            this.blocks.push(this.lastCreatedUL);
            break;
          case "OLC":
            this.lastCreatedOL.children.push(this.currentBlock);
            break;
          case "ULC":
            this.lastCreatedUL.children.push(this.currentBlock);
            break;
          case "OLSC":
            this.lastCreatedOLC.children.push(this.currentBlock);
            break;
          case "ULSC":
            this.lastCreatedULC.children.push(this.currentBlock);
            break;
          case "OLSSC":
            this.lastCreatedOLSC.children.push(this.currentBlock);
            break;
          case "ULSSC":
            this.lastCreatedULSC.children.push(this.currentBlock);
            break;
        }
      } else {
        this.currentBlock.id = prefixTable(generateUID(), Resource.node);
        this.blocks.push(this.currentBlock);
      }
      this.currentBlock = { ...this.defaultBlock };
    }
  }

  loopThroughAndDecodeV1(words: string[]) {
    for (let i = 0; i < words.length; i++) {
      this.word = words[i];
      switch (this.word) {
        case "H1":
        case "H2":
        case "H3":
        case "H4":
        case "H5":
        case "H6":
          this.pushCurrentBlockToBlocksV1();
          this.currentBlock.contentType = `HEADING${this.word.slice(1)}`;
          this.currentBlock.body = "";
          this.currentBlock.id = prefixTable(generateUID(), Resource.node);
          break;
        case "OL":
        case "UL":
          this.pushCurrentBlockToBlocksV1();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = prefixTable(generateUID(), Resource.node);
          if (this.word === "OL") {
            this.currentBlock.listType = "ORDERED";
            this.lastCreatedOL = this.currentBlock;
            this.lastCreatedListVariantV1 = "OL";
          } else {
            this.currentBlock.listType = "UNORDERED";
            this.lastCreatedUL = this.currentBlock;
            this.lastCreatedListVariantV1 = "UL";
          }
          break;
        case "OLC":
        case "ULC":
          this.pushCurrentBlockToBlocksV1();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = generateUID();
          if (this.word === "OLC") {
            this.currentBlock.listType = "ORDERED";
            this.lastCreatedOLC = this.currentBlock;
            this.lastCreatedListVariantV1 = "OLC";
          } else {
            this.currentBlock.listType = "UNORDERED";
            this.lastCreatedULC = this.currentBlock;
            this.lastCreatedListVariantV1 = "ULC";
          }
          break;
        case "OLSC":
        case "ULSC":
          this.pushCurrentBlockToBlocksV1();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = generateUID();
          if (this.word === "OLSC") {
            this.currentBlock.listType = "ORDERED";
            this.lastCreatedOLSC = this.currentBlock;
            this.lastCreatedListVariantV1 = "OLSC";
          } else {
            this.currentBlock.listType = "UNORDERED";
            this.lastCreatedULSC = this.currentBlock;
            this.lastCreatedListVariantV1 = "ULSC";
          }
          break;
        case "OLSSC":
        case "ULSSC":
          this.pushCurrentBlockToBlocksV1();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = generateUID();
          if (this.word === "OLSSC") {
            this.currentBlock.listType = "ORDERED";
            this.lastCreatedListVariantV1 = "OLSSC";
          } else {
            this.currentBlock.listType = "UNORDERED";
            this.lastCreatedListVariantV1 = "ULSSC";
          }
          break;
        case "H1E":
        case "H2E":
        case "H3E":
        case "H4E":
        case "H5E":
        case "H6E":
          this.blocks.push(this.currentBlock);
          this.currentBlock = { ...this.defaultBlock };
          break;
        case "OLE":
        case "ULE":
          this.blocks.push(this.currentBlock);
          this.currentBlock = { ...this.defaultBlock };
          break;
        case "OLCE":
          this.lastCreatedOL.children.push(this.currentBlock);
          this.currentBlock = { ...this.defaultBlock };
          break;
        case "OLSCE":
          this.lastCreatedOLC.children.push(this.currentBlock);
          this.currentBlock = { ...this.defaultBlock };
          break;
        case "OLSSCE":
          this.lastCreatedOLSC.children.push(this.currentBlock);
          this.currentBlock = { ...this.defaultBlock };
          break;
        case "ULCE":
          this.lastCreatedUL.children.push(this.currentBlock);
          this.currentBlock = { ...this.defaultBlock };
          break;
        case "ULSCE":
          this.lastCreatedULC.children.push(this.currentBlock);
          this.currentBlock = { ...this.defaultBlock };
          break;
        case "ULSSCE":
          this.lastCreatedULSC.children.push(this.currentBlock);
          this.currentBlock = { ...this.defaultBlock };
          break;
        case "IS":
        case "ISE":
          this.currentBlock.body += "*";
        case "BS":
        case "BSE":
          this.currentBlock.body += "**";
        default:
          if (this.currentBlock.body && this.currentBlock.body.length > 0)
            this.currentBlock.body += " " + this.word;
          else this.currentBlock.body = this.word;
      }
    }
    this.pushCurrentBlockToBlocksV1();
  }

  /**
   * Replace patterns like * string * with *string* and ** string ** with **string**
   * @param input - input string
   * @returns output - output string
   */
  removeSpacesBetweenAsterisks(input: string): string {
    input = input.replace(/\*\s+([^\*]+?)\s+\*/g, "*$1*");
    const output = input.replace(/\*\*\s+([^\*]+?)\s+\*\*/g, "**$1**");
    return output;
  }

  pushCurrentBlockToBlocksV2() {
    if (this.currentBlock.body && this.currentBlock.body.length > 0) {
      this.currentBlock.body = this.removeSpacesBetweenAsterisks(
        this.currentBlock.body
      );
      if (this.currentBlock.contentType === "LIST") {
        switch (this.lastCreatedListVariantV2) {
          case "OL":
          case "ol":
            this.blocks.push(this.lastCreatedOL);
            break;
          case "UL":
          case "ul":
            this.blocks.push(this.lastCreatedUL);
            break;
          case "OLchild":
          case "olchild":
            this.lastCreatedOL.children.push(this.currentBlock);
            break;
          case "ULchild":
          case "ulchild":
            this.lastCreatedUL.children.push(this.currentBlock);
            break;
          case "OLsubchild":
          case "olsubchild":
            this.lastCreatedOLchild.children.push(this.currentBlock);
            break;
          case "ULsubchild":
          case "ulsubchild":
            this.lastCreatedULchild.children.push(this.currentBlock);
            break;
          case "OLsubsubchild":
          case "olsubsubchild":
            this.lastCreatedOLsubchild.children.push(this.currentBlock);
            break;
          case "ULsubsubchild":
          case "ulsubsubchild":
            this.lastCreatedULsubchild.children.push(this.currentBlock);
            break;
        }
      } else {
        this.currentBlock.id = prefixTable(generateUID(), Resource.node);
        this.blocks.push(this.currentBlock);
      }
      this.currentBlock = { ...this.defaultBlock };
    }
  }
  checkForKeywords(
    c0: string,
    c1: string,
    c2: string,
    c3: string,
    c4: string
  ): [string, number] {
    if (this.keywords.includes(c4)) return [c4, 4];
    else if (this.keywords.includes(c3)) return [c3, 3];
    else if (this.keywords.includes(c2)) return [c2, 2];
    else if (this.keywords.includes(c1)) return [c1, 1];
    else return [c0, 0];
  }

  loopThroughAndDecodeV2(words: string[]) {
    for (let i = 0; i < words.length; i++) {
      const combined2 = words[i] + words[i + 1];
      const combined3 = combined2 + words[i + 2];
      const combined4 = combined3 + words[i + 3];
      const combined5 = combined4 + words[i + 4];
      let add = 0;
      [this.word, add] = this.checkForKeywords(
        words[i],
        combined2,
        combined3,
        combined4,
        combined5
      );
      i += add;
      if (this.stopKeywords.includes(this.word)) {
        this.pushCurrentBlockToBlocksV2();
        continue;
      }
      switch (this.word) {
        case "H1":
        case "H2":
        case "H3":
        case "H4":
        case "H5":
        case "H6":
          this.pushCurrentBlockToBlocksV2();
          this.currentBlock.contentType = `HEADING${this.word.slice(1)}`;
          this.currentBlock.body = "";
          this.currentBlock.id = prefixTable(generateUID(), Resource.node);
          break;
        case "OL":
        case "ol":
        case "UL":
        case "ul":
          this.pushCurrentBlockToBlocksV2();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = prefixTable(generateUID(), Resource.node);
          if (this.word === "OL" || this.word === "ol") {
            this.currentBlock.listType = "ORDERED";
            delete this.lastCreatedOL.children;
            this.lastCreatedOL = {};
            this.lastCreatedOL = this.currentBlock;
            this.lastCreatedListVariantV2 = "OL";
          } else {
            this.currentBlock.listType = "UNORDERED";
            this.lastCreatedUL = {};
            this.lastCreatedUL = this.currentBlock;
            this.lastCreatedListVariantV2 = "UL";
          }
          break;
        case "OLchild":
        case "olchild":
        case "ULchild":
        case "ulchild":
          this.pushCurrentBlockToBlocksV2();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = generateUID();
          if (this.word === "OLchild" || this.word === "olchild") {
            this.currentBlock.listType = "ORDERED";
            this.lastCreatedOLchild = {};
            this.lastCreatedOLchild = this.currentBlock;
            this.lastCreatedListVariantV2 = "OLchild";
          } else {
            this.currentBlock.listType = "UNORDERED";
            this.lastCreatedULchild = {};
            this.lastCreatedULchild = this.currentBlock;
            this.lastCreatedListVariantV2 = "ULchild";
          }
          break;
        case "OLsubchild":
        case "olsubchild":
        case "ULsubchild":
        case "ulsubchild":
          this.pushCurrentBlockToBlocksV2();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = generateUID();
          if (this.word === "OLsubchild" || this.word === "olsubchild") {
            this.currentBlock.listType = "ORDERED";
            this.lastCreatedOLsubchild = {};
            this.lastCreatedOLsubchild = this.currentBlock;
            this.lastCreatedListVariantV2 = "OLsubchild";
          } else {
            this.currentBlock.listType = "UNORDERED";
            this.lastCreatedULsubchild = {};
            this.lastCreatedULsubchild = this.currentBlock;
            this.lastCreatedListVariantV2 = "ULsubchild";
          }
          break;
        case "OLsubsubchild":
        case "olsubsubchild":
        case "ULsubsubchild":
        case "ulsubsubchild":
          this.pushCurrentBlockToBlocksV2();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = generateUID();
          if (this.word === "OLsubsubchild" || this.word === "olsubsubchild") {
            this.currentBlock.listType = "ORDERED";
            this.lastCreatedListVariantV2 = "OLsubsubchild";
          } else {
            this.currentBlock.listType = "UNORDERED";
            this.lastCreatedListVariantV2 = "ULsubsubchild";
          }
          break;
        case "italic":
        case "italicstop":
          if (this.currentBlock.body && this.currentBlock.body.length > 0)
            this.currentBlock.body += " " + "*";
          else this.currentBlock.body = "*";
          break;
        case "bold":
        case "boldstop":
          if (this.currentBlock.body && this.currentBlock.body.length > 0)
            this.currentBlock.body += " " + "**";
          else this.currentBlock.body = "**";
          break;
        default:
          if (this.currentBlock.body && this.currentBlock.body.length > 0)
            this.currentBlock.body += " " + this.word;
          else this.currentBlock.body = this.word;
      }
    }
    this.pushCurrentBlockToBlocksV2();
  }
  convertAudioToMarkdownV1(transcript: string) {
    this.resetInitialStatesV1();
    let words: string[] = transcript
      .split(/\W+/)
      .filter((word: string) => word.length > 0);
    this.loopThroughAndDecodeV1(words);
    return this.blocks;
  }
  convertAudioToMarkdownV2(transcript: string) {
    this.resetInitialStatesV2();
    let words: string[] = transcript
      .split(/\W+/)
      .filter((word: string) => word.length > 0);
    this.loopThroughAndDecodeV2(words);
    return this.blocks;
  }
}

export const Audio2MD = new AudioToMarkdown();
