import { resolveUrlPartsV2, userDatev4 } from "./dbo";

/**
 * Memotron dbo definitions used by the client apps.
 */
export const memotronDboDefinitions = {
  "fn::memotron::node::fetch": nodeFetch(),
  "fn::memotron::node::create": nodeCreate(),
  "fn::memotron::pdfAnnotator::getAllClips": pdfAnnotatorGetAllClips(),
  "fn::memotron::pdfAnnotator::saveClip": pdfAnnotatorSaveClip(),
  "fn::memotron::clipper::fetchPage": clipperFetchPage(),
  "fn::memotron::collection::fetchData": collectionFecthData(),
  "fn::memotron::timeline": timeline(),
  "fn::memotron::link": link(),
  "fn::memotron::clipper::saveClip": saveClip(),
  "fn::memotron::clipper::saveWebpage": saveWebpage(),
  "fn::memotron::node::createMany": nodeCreateMany()
};

function nodeFetch() {
  const def = `define function fn::memotron::node::fetch($id: record){
    return array::first(select *, (select * from node where parent is $id) as clips,
    (fn::memotron::node::children($parent.children)) as children, 
    (fn::memotron::node::parent($id)) as mdParent,
    ->link->collection as collections from node where id is $id);
};`;
  return [...nodeChildren(), ...nodeParent(), def];
}

function nodeChildren() {
  const def = `DEFINE FUNCTION fn::memotron::node::children($x: option<array>) {
    return if type::is::array($x) and array::len($x) > 0 {
         return select fn::memotron::node::children(children) as children, * from $x;
    } else {
        return [];
    }
};`;
  return [def];
}

function nodeParent() {
  const def = `DEFINE FUNCTION fn::memotron::node::parent($node: record) {
    let $results = select id from node where $node in children;
    return if array::len($results) is 1  {
        let $higher = return fn::memotron::node::parent($results[0].id);
        return array::append($higher, $results[0].id);
    } else {
        return $results;
    }
};`;
  return [def];
}

function pdfAnnotatorGetAllClips() {
  const def = `DEFINE FUNCTION fn::memotron::pdfAnnotator::getAllClips($url: string) {
      RETURN (SELECT clips, fn::memotron::fetchClips(id) AS clips FROM node WHERE url = $url);
  };`;
  return [...fetchClips(), def];
}

function fetchClips() {
  const def = `DEFINE FUNCTION fn::memotron::fetchClips($id: record){
      return select *, ->link.out.id as links from node where parent is $id;
  };`;
  return [def];
}

function pdfAnnotatorSaveClip() {
  const def = `DEFINE FUNCTION fn::memotron::pdfAnnotator::saveClip($url: string, $content: any) {
      LET $parentNode = (RETURN array::first((SELECT VALUE id FROM node WHERE url = $url)));
      LET $record = (CREATE node SET parent = $parentNode, contentType = $content.contentType, body = $content.body, createdAt = time::now(), modifiedAt = time::now());
      RETURN array::first($record);
  };`;
  return [def];
}

function nodeCreate() {
  const def = `define function fn::memotron::node::create($node: any, $links: array, $mutatedAt: int){ 
update kv:mutationMap merge {node: $mutatedAt }; 
let $created = insert into node $node; 
return select fn::memotron::link(from, to, linkType) from $links; };`;
  return [...link(), def];
}

/**
 * @deprecated - use direct insert + linkMany instead
 *
 * Using this function via surreal.js + surreal.wasm is causing record links not recognized as Record Ids. Using direct Insert query instead.
 *
 * @returns
 */
function nodeCreateMany() {
  const def = `define function fn::memotron::node::createMany($resources: any){
    let $created = insert into node $resources;
    select fn::memotron::linkMany(links) from $resources;
    return $created;
};`;
  return [...linkMany(), def];
}

function linkMany() {
  const def = `define function fn::memotron::linkMany($links: option<array>){
    return if type::is::array($links) and array::len($links) > 0 {
        return select fn::memotron::link(from, to, linkType) from $links;
    } else {
        return NONE;
    }
};`;
  return [...link(), def];
}

function link() {
  const def = `define function fn::memotron::link($from: record, $to: record, $linkType: option<string>){
    relate $from->link->$to content {toType: meta::tb($to), linkType: $linkType, createdAt: time::now()}
};`;
  return [def];
}

/**
 * @deprecated - using direct client query instead
 * @returns
 */
function unlink() {
  const def = `DEFINE FUNCTION fn::memotron::unlink($from: record, $to: record){
    DELETE $from->link where out=$to;
};`;
  return [def];
}

function timeline() {
  const def = `DEFINE FUNCTION fn::memotron::timeline($day: datetime) {
    let $nodes = select id, contentType, parent, creationContext from node where time::day(fn::user::time::date::v4(createdAt)) is time::day($day);
    let $clips = select * from $nodes where string::contains(contentType, 'CLIP');
    let $filteredNodes = select * from $nodes where (contentType is "NODULAR_MARKDOWN" or creationContext is NONE );
    let $clipPages = select id from node where id in $clips.parent;
    let $distinctIds = array::distinct(array::concat(select value id from $filteredNodes, select value id from $clipPages));
    return select value fn::memotron::node::fetch(id) from $distinctIds;
};`;
  return [...userDatev4(), ...nodeFetch(), def];
}

function collectionFecthData() {
  const def = `DEFINE FUNCTION fn::memotron::collection::fetchData($viewId: record, $collectionId: record){
      let $view = select * from $viewId;
      RETURN IF meta::tb($collectionId) is 'node' {
          let $backdirectlinks = array::first(RETURN SELECT VALUE <-link<-node from $collectionId);
          let $foredirectlinks = array::first(RETURN SELECT VALUE ->link->node from $collectionId);
          let $collections = array::first(RETURN SELECT VALUE ->link->collection from $collectionId);
          return {directlinks: array::concat($backdirectlinks, $foredirectlinks), collections: $collections};
      } else if meta::tb($collectionId) is 'collection' and $curation.query is none {
          let $entryIds = array::first(RETURN SELECT VALUE <-link<-node.id from $collectionId);
          let $entries = select value fn::memotron::node::fetch(id) from $entryIds;
          return $entries;
      } else {
          return [];
      }
  };`;
  return [...nodeFetch(), def];
}

/**
 * @deprecated - using client store and mutation queue instead
 * @returns
 */
function saveClip() {
  const def = `DEFINE FUNCTION fn::memotron::clipper::saveClip($id: any, $content: any, $webpagedata: any) {
      let $existingNode = RETURN IF type::is::record($id) THEN $id ELSE array::first(select value id from node where url is $id) END;
      let $node = RETURN IF $existingNode is NONE THEN fn::memotron::clipper::saveWebpage($id, $webpagedata).id ELSE $existingNode END;
      let $record = CREATE node set parent = $node, contentType = $content.contentType, body = $content.body, 
          metadata = $content.metadata, createdAt = time::now(), modifiedAt = time::now();
      return array::first($record);
  };`;
  return [...saveWebpage(), def];
}

/**
 * @deprecated - using client store and mutation queue instead
 * @returns
 */
function saveWebpage() {
  const def = `DEFINE FUNCTION fn::memotron::clipper::saveWebpage($url: string, $data: any){
      let $existingNode = select * from node where url is $url;
      return if array::len($existingNode) is 0 {
          return array::first(CREATE node set url = $url, label = $data.label, metadata = $data.metadata, 
          contentType = 'WEBPAGE', contentHash = $data.hash, urlParts = fn::global::utils::resolveUrlParts::v2($url), 
          createdAt = time::now(), modifiedAt = time::now());
      } else {
          return $existingNode[0];
      }
  };`;
  return [...resolveUrlPartsV2(), def];
}

function clipperFetchPage() {
  const def = `DEFINE FUNCTION fn::memotron::clipper::fetchPage($url: string){
      let $page = array::first(select *, fn::memotron::fetchClips(id) as clips, ->link.out.id as links from node where body.url is $url);
      let $similarPageIds = return fn::memotron::clipper::fetchSimilarPages($url);
      let $similarPages = select *, fn::memotron::fetchClips(id) as clips from node where id in $similarPageIds;
      return { page: $page, similar: $similarPages};
  };`;
  return [...fetchClips(), ...clipperFetchSimilarPages(), def];
}

/**
 * TODO - separate returning similar pages based on only host vs path
 * @returns
 */
function clipperFetchSimilarPages() {
  const def = `DEFINE FUNCTION fn::memotron::clipper::fetchSimilarPages($url: string){
      let $parts = return fn::global::utils::resolveUrlParts::v2($url);
      return select id from node where (urlParts.host is $parts.host and urlParts.path is $parts.path) or urlParts.host is $parts.host;
  };`;
  return [def];
}
