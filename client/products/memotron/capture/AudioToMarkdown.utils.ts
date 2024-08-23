
interface Block {
  contentType?: string;
  body?: string;
  listType?: string;
  children?: Block[];
}


class AudioToMarkdown{
     words:string[] | undefined
     flag = true;
     word: string | undefined;
     blocks:Block[] = [];
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
     lastCreatedListVariant:
      | "OL"
      | "UL"
      | "OLC"
      | "ULC"
      | "OLSC"
      | "ULSC"
      | "OLSSC"
      | "ULSSC"
      | null = null;
    currentBlock= { ...this.defaultBlock };

    resetInitialStates(){
      this.lastCreatedOL = {};
     this.lastCreatedOLC = {};
     this.lastCreatedOLSC = {};
     this.lastCreatedUL = {};
     this.lastCreatedULC = {};
     this.lastCreatedULSC = {};
     this.lastCreatedListVariant= null;
    this.currentBlock= { ...this.defaultBlock };
    }

    pushCurrentBlockToBlocks(){
    if (this.currentBlock.body && this.currentBlock.body.length > 0) {
        if (this.currentBlock.contentType === "LIST") {
          switch (this.lastCreatedListVariant) {
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
        } else this.blocks.push(this.currentBlock);
        this.currentBlock = { ...this.defaultBlock };
      }
    }
    
    convertAudioToMarkdown(transcript: string){
    this.resetInitialStates();
    let words:string[] = transcript
      .split(/\W+/)
      .filter((word: string) => word.length > 0);
    console.log("audio to md WORDS", words);
    for (let i = 0; i < words.length && this.flag; i++) {
      this.word = words[i];
      switch (this.word) {
        case "H1":
        case "H2":
        case "H3":
        case "H4":
        case "H5":
        case "H6":
          this.pushCurrentBlockToBlocks();
          this.currentBlock.contentType = `HEADING${this.word.slice(1)}`;
          this.currentBlock.body = "";
          break;
        case "OL":
        case "UL":
          this.pushCurrentBlockToBlocks();
          this.currentBlock = { ...this.defaultListBlockValues };
          if (this.word === "OL") {
            this.currentBlock.listType = "ORDERED";
            this.lastCreatedOL = this.currentBlock;
            this.lastCreatedListVariant = "OL";
          } else {
            this.currentBlock.listType = "UNORDERED";
            this.lastCreatedUL = this.currentBlock;
            this.lastCreatedListVariant = "UL";
          }
          break;
        case "OLC":
        case "ULC":
          this.pushCurrentBlockToBlocks();
          this.currentBlock = { ...this.defaultListBlockValues };
          if (this.word === "OLC") {
            this.currentBlock.listType = "ORDERED";
            this.lastCreatedOLC = this.currentBlock;
            this.lastCreatedListVariant = "OLC";
          } else {
            this.currentBlock.listType = "UNORDERED";
            this.lastCreatedULC = this.currentBlock;
            this.lastCreatedListVariant = "ULC";
          }
          break;
        case "OLSC":
        case "ULSC":
          this.pushCurrentBlockToBlocks();
          this.currentBlock = { ...this.defaultListBlockValues };
          if (this.word === "OLSC") {
            this.currentBlock.listType = "ORDERED";
            this.lastCreatedOLSC = this.currentBlock;
            this.lastCreatedListVariant = "OLSC";
          } else {
            this.currentBlock.listType = "UNORDERED";
            this.lastCreatedULSC = this.currentBlock;
            this.lastCreatedListVariant = "ULSC";
          }
          break;
        case "OLSSC":
        case "ULSSC":
          this.pushCurrentBlockToBlocks();
          this.currentBlock = { ...this.defaultListBlockValues };
          if (this.word === "OLSSC") {
            this.currentBlock.listType = "ORDERED";
            this.lastCreatedListVariant = "OLSSC";
          } else {
            this.currentBlock.listType = "UNORDERED";
            this.lastCreatedListVariant = "ULSSC";
          }
          break;
        case "H1E":
        case "H2E":
        case "H3E":
        case "H4E":
        case "H5E":
        case "H6E":
          this.blocks.push(this.currentBlock);
          // console.log("audio to md BLOCKS", [...this.blocks]);
          this.currentBlock = { ...this.defaultBlock };
          // flag = false;
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
          if (this.currentBlock.body && this.currentBlock.body.length > 0) this.currentBlock.body += " " + this.word;
          else this.currentBlock.body = this.word;
      }
      console.log("audio to md CURRENT BLOCK", this.currentBlock, [...this.blocks]);
    }
    this.pushCurrentBlockToBlocks();
}
}

export const Audio2MD= new AudioToMarkdown();