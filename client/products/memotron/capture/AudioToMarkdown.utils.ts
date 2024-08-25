import { prefixTable } from "$lib/shared/utils/text.utils";
import { generateUID } from "$lib/client/utils/utils";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { ListType } from "../node/node.type";

interface Block {
  id?: string;
  contentType?: string;
  body?: string;
  listType?: string;
  children?: Block[];
}

enum ListKeys {
  OL = "ol",
  OL_CHILD = "olchild",
  OL_SUB_CHILD = "olsubchild",
  OL_SUB_SUB_CHILD = "olsubsubchild",
  UL = "ul",
  UL_CHILD = "ulchild",
  UL_SUB_CHILD = "ulsubchild",
  UL_SUB_SUB_CHILD = "ulsubsubchild"
}

enum HeadingKeys {
  H1 = "h1",
  H2 = "h2",
  H3 = "h3",
  H4 = "h4",
  H5 = "h5",
  H6 = "h6"
}
enum InlineKeys {
  ITALIC = "italic",
  BOLD = "bold"
}

class AudioToMarkdown {
  words: string[] | undefined;
  word: string | undefined;
  readonly h1Case = [HeadingKeys.H1, "hone", "heading1", "headingone"];
  readonly h2Case = [HeadingKeys.H2, "htwo", "heading2", "headingtwo"];
  readonly h3Case = [HeadingKeys.H3, "hthree", "heading3", "headingthree"];
  readonly h4Case = [HeadingKeys.H4, "hfour", "heading4", "headingfour"];
  readonly h5Case = [HeadingKeys.H5, "hfive", "heading5", "headingfive"];
  readonly h6Case = [HeadingKeys.H6, "hsix", "heading6", "headingsix"];

  readonly headingCase = [
    ...this.h1Case,
    ...this.h2Case,
    ...this.h3Case,
    ...this.h4Case,
    ...this.h5Case,
    ...this.h6Case
  ];
  readonly olCase = [ListKeys.OL, "orderedlist"];
  readonly ulCase = [ListKeys.UL, "unorderedlist", "bullet"];
  readonly olChildCase = [ListKeys.OL_CHILD, "orderedlistchild"];
  readonly ulChildCase = [
    ListKeys.UL_CHILD,
    "unorderedlistchild",
    "bulletchild"
  ];
  readonly olSubChildCase = [ListKeys.OL_SUB_CHILD, "orderedlistsubchild"];
  readonly ulSubChildCase = [
    ListKeys.UL_SUB_CHILD,
    "unorderedlistsubchild",
    "bulletsubchild"
  ];
  readonly olSubSubChildCase = [
    ListKeys.OL_SUB_SUB_CHILD,
    "orderedlistsubsubchild"
  ];
  readonly ulSubSubChildCase = [
    ListKeys.UL_SUB_SUB_CHILD,
    "unorderedlistsubsubchild",
    "bulletsubsubchild"
  ];
  readonly italicCase = [InlineKeys.ITALIC, "italicstop"];
  readonly boldCase = [InlineKeys.BOLD, "boldstop"];

  readonly h1StopCase = [
    "h1stop",
    "honestop",
    "heading1stop",
    "headingonestop"
  ];
  readonly h2StopCase = [
    "h2stop",
    "htwostop",
    "heading2stop",
    "headingtwostop"
  ];
  readonly h3StopCase = [
    "h3stop",
    "hthreestop",
    "heading3stop",
    "headingthreestop"
  ];
  readonly h4StopCase = [
    "h4stop",
    "hfourstop",
    "heading4stop",
    "headingfourstop"
  ];
  readonly h5StopCase = [
    "h5stop",
    "hfivestop",
    "heading5stop",
    "headingfivestop"
  ];
  readonly h6StopCase = [
    "h6stop",
    "hsixstop",
    "heading6stop",
    "headingsixstop"
  ];
  readonly olStopCase = ["olstop", "orderedliststop"];
  readonly ulStopCase = ["ulstop", "unorderedliststop", "bulletstop"];
  readonly olChildStopCase = ["olchildstop", "orderedlistchildstop"];
  readonly ulChildStopCase = [
    "ulchildstop",
    "unorderedlistchildstop",
    "bulletchildstop"
  ];
  readonly olSubChildStopCase = ["olsubchildstop", "orderedlistsubchildstop"];
  readonly ulSubChildStopCase = [
    "ulsubchildstop",
    "unorderedlistsubchildstop",
    "bulletsubchildstop"
  ];
  readonly olSubSubChildStopCase = [
    "olsubsubchildstop",
    "orderedlistsubsubchildstop"
  ];
  readonly ulSubSubChildStopCase = [
    "ulsubsubchildstop",
    "unorderedlistsubsubchildstop",
    "bulletsubsubchildstop"
  ];

  readonly stopCase = ["blankstop"];

  readonly stopKeywords = [
    ...this.h1StopCase,
    ...this.h2StopCase,
    ...this.h3StopCase,
    ...this.h4StopCase,
    ...this.h5StopCase,
    ...this.h6StopCase,
    ...this.olStopCase,
    ...this.ulStopCase,
    ...this.olChildStopCase,
    ...this.ulChildStopCase,
    ...this.olSubChildStopCase,
    ...this.ulSubChildStopCase,
    ...this.olSubSubChildStopCase,
    ...this.ulSubSubChildStopCase,
    ...this.stopCase
  ];

  readonly keywords = [
    ...this.headingCase,
    ...this.olCase,
    ...this.ulCase,
    ...this.olChildCase,
    ...this.ulChildCase,
    ...this.olSubChildCase,
    ...this.ulSubChildCase,
    ...this.olSubSubChildCase,
    ...this.ulSubSubChildCase,
    ...this.italicCase,
    ...this.boldCase,
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
  lastCreatedListVariantV2: ListKeys | null = null;
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
   * Replaces patterns like * string * with *string* and ** string ** with **string**
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
          case ListKeys.OL:
            this.blocks.push(this.lastCreatedOL);
            break;
          case ListKeys.UL:
            this.blocks.push(this.lastCreatedUL);
            break;
          case ListKeys.OL_CHILD:
            this.lastCreatedOL.children.push(this.currentBlock);
            break;
          case ListKeys.UL_CHILD:
            this.lastCreatedUL.children.push(this.currentBlock);
            break;
          case ListKeys.OL_SUB_CHILD:
            this.lastCreatedOLchild.children.push(this.currentBlock);
            break;
          case ListKeys.UL_SUB_CHILD:
            this.lastCreatedULchild.children.push(this.currentBlock);
            break;
          case ListKeys.OL_SUB_SUB_CHILD:
            this.lastCreatedOLsubchild.children.push(this.currentBlock);
            break;
          case ListKeys.UL_SUB_SUB_CHILD:
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
    let currentWord: string = "";
    for (let i = 0; i < words.length; i++) {
      const casePreservedWord = words[i];
      const combined2 = words[i] + words[i + 1];
      const combined3 = combined2 + words[i + 2];
      const combined4 = combined3 + words[i + 3];
      const combined5 = combined4 + words[i + 4];
      let add = 0;
      [currentWord, add] = this.checkForKeywords(
        words[i].toLowerCase(),
        combined2.toLowerCase(),
        combined3.toLowerCase(),
        combined4.toLowerCase(),
        combined5.toLowerCase()
      );
      i += add;
      if (this.stopKeywords.includes(currentWord)) {
        this.pushCurrentBlockToBlocksV2();
        continue;
      }
      switch (true) {
        case this.headingCase.includes(currentWord):
          this.pushCurrentBlockToBlocksV2();
          this.currentBlock.contentType = `HEADING${currentWord.slice(1)}`;
          this.currentBlock.body = "";
          this.currentBlock.id = prefixTable(generateUID(), Resource.node);
          break;
        case this.olCase.includes(currentWord):
          this.pushCurrentBlockToBlocksV2();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = prefixTable(generateUID(), Resource.node);
          this.currentBlock.listType = ListType.ORDERED;
          this.lastCreatedOL = {};
          this.lastCreatedOL = this.currentBlock;
          this.lastCreatedListVariantV2 = ListKeys.OL;
          break;
        case this.ulCase.includes(currentWord):
          this.pushCurrentBlockToBlocksV2();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = prefixTable(generateUID(), Resource.node);
          this.currentBlock.listType = ListType.UNORDERED;
          this.lastCreatedUL = {};
          this.lastCreatedUL = this.currentBlock;
          this.lastCreatedListVariantV2 = ListKeys.UL;
          break;
        case this.olChildCase.includes(currentWord):
          this.pushCurrentBlockToBlocksV2();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = generateUID();
          this.currentBlock.listType = ListType.ORDERED;
          this.lastCreatedOLchild = {};
          this.lastCreatedOLchild = this.currentBlock;
          this.lastCreatedListVariantV2 = ListKeys.OL_CHILD;
          break;
        case this.ulChildCase.includes(currentWord):
          this.pushCurrentBlockToBlocksV2();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = generateUID();
          this.currentBlock.listType = ListType.UNORDERED;
          this.lastCreatedULchild = {};
          this.lastCreatedULchild = this.currentBlock;
          this.lastCreatedListVariantV2 = ListKeys.UL_CHILD;
          break;
        case this.olSubChildCase.includes(currentWord):
          this.pushCurrentBlockToBlocksV2();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = generateUID();
          this.currentBlock.listType = ListType.ORDERED;
          this.lastCreatedOLsubchild = {};
          this.lastCreatedOLsubchild = this.currentBlock;
          this.lastCreatedListVariantV2 = ListKeys.OL_SUB_CHILD;
          break;
        case this.ulSubChildCase.includes(currentWord):
          this.pushCurrentBlockToBlocksV2();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = generateUID();
          this.currentBlock.listType = ListType.UNORDERED;
          this.lastCreatedULsubchild = {};
          this.lastCreatedULsubchild = this.currentBlock;
          this.lastCreatedListVariantV2 = ListKeys.UL_SUB_CHILD;
          break;
        case this.olSubSubChildCase.includes(currentWord):
          this.pushCurrentBlockToBlocksV2();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = generateUID();
          this.currentBlock.listType = ListType.ORDERED;
          this.lastCreatedListVariantV2 = ListKeys.OL_SUB_SUB_CHILD;
          break;
        case this.ulSubSubChildCase.includes(currentWord):
          this.pushCurrentBlockToBlocksV2();
          this.currentBlock = JSON.parse(
            JSON.stringify(this.defaultListBlockValues)
          );
          this.currentBlock.id = generateUID();
          this.currentBlock.listType = ListType.UNORDERED;
          this.lastCreatedListVariantV2 = ListKeys.UL_SUB_SUB_CHILD;
          break;
        case this.italicCase.includes(currentWord):
          if (this.currentBlock.body && this.currentBlock.body.length > 0)
            this.currentBlock.body += " " + "*";
          else this.currentBlock.body = "*";
          break;
        case this.boldCase.includes(currentWord):
          if (this.currentBlock.body && this.currentBlock.body.length > 0)
            this.currentBlock.body += " " + "**";
          else this.currentBlock.body = "**";
          break;
        default:
          if (this.currentBlock.body && this.currentBlock.body.length > 0)
            this.currentBlock.body += " " + casePreservedWord;
          else this.currentBlock.body = casePreservedWord;
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
