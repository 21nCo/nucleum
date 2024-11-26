import { userDatev4 } from "./global.dbo";

/**
 * Memotron dbo definitions used by the client apps.
 */
export const memotronDboDefinitions = {
  "fn::memotron::node::fetch": nodeFetch(),
  "fn::memotron::timeline": timeline()
};

function nodeFetch() {
  const def = `DEFINE FUNCTION OVERWRITE fn::memotron::node::fetch($id: record){
    return array::first(select *, parent.* as parent, file.* as file, (select * from node where parent is $id) as clips,
    (fn::memotron::node::children($parent.children)) as children, 
     ->link.* as outlinks, <-link.* as inlinks, array::concat(->link.*, <-link.*) as links from node where id is $id);
};`;
  return [...nodeChildren(), ...nodeParent(), def];
}

function nodeChildren() {
  const def = `DEFINE FUNCTION OVERWRITE fn::memotron::node::children($x: option<array>) {
    return if type::is::array($x) and array::len($x) > 0 {
         return select fn::memotron::node::children(children) as children, * from $x;
    } else {
        return [];
    }
};`;
  return [def];
}

function nodeParent() {
  const def = `DEFINE FUNCTION OVERWRITE fn::memotron::node::parent($node: record) {
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

/**
 * @deprecated - direct querying
 * @returns
 */
function pdfAnnotatorGetAllClips() {
  const def = `DEFINE FUNCTION OVERWRITE fn::memotron::pdfAnnotator::getAllClips($url: string) {
      RETURN (SELECT clips, fn::memotron::fetchClips(id) AS clips FROM node WHERE url = $url);
  };`;
  return [...fetchClips(), def];
}

function fetchClips() {
  const def = `DEFINE FUNCTION OVERWRITE fn::memotron::fetchClips($id: record){
      return select *, ->link.out.id as links from node where parent is $id;
  };`;
  return [def];
}

/**
 * @deprecated - direct querying
 * @returns
 */
function pdfAnnotatorSaveClip() {
  const def = `DEFINE FUNCTION OVERWRITE fn::memotron::pdfAnnotator::saveClip($url: string, $content: any) {
      LET $parentNode = (RETURN array::first((SELECT VALUE id FROM node WHERE url = $url)));
      LET $record = (CREATE node SET parent = $parentNode, contentType = $content.contentType, body = $content.body, createdAt = time::now(), modifiedAt = time::now());
      RETURN array::first($record);
  };`;
  return [def];
}

function timeline() {
  const def = `DEFINE FUNCTION OVERWRITE fn::memotron::timeline($day: datetime) {
    let $nodes = select id, contentType, parent, creationContext from node where time::day(fn::user::time::date::v4(createdAt)) is time::day($day);
    let $clips = select * from $nodes where string::contains(contentType, 'CLIP');
    let $filteredNodes = select * from $nodes where (contentType is "NODULAR_MARKDOWN" or creationContext is NONE );
    let $clipPages = select id from node where id in $clips.parent;
    let $distinctIds = array::distinct(array::concat(select value id from $filteredNodes, select value id from $clipPages));
    return select value fn::memotron::node::fetch(id) from $distinctIds;
};`;
  return [...userDatev4(), ...nodeFetch(), def];
}

/**
 * @deprecated - using direct querying
 * @returns
 */
function collectionFetchData() {
  const def = `DEFINE FUNCTION OVERWRITE fn::memotron::collection::fetchData($viewId: record, $collectionId: record){
      let $view = select * from $viewId;
      let $collection = select * from $collectionId;
      RETURN IF meta::tb($collectionId) is 'collection' {
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
 * @deprecated
 * @returns
 */
function clipperFetchPage() {
  const def = `DEFINE FUNCTION OVERWRITE fn::memotron::clipper::fetchPage($url: string){
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
  const def = `DEFINE FUNCTION OVERWRITE fn::memotron::clipper::fetchSimilarPages($url: string){
      let $parts = return fn::global::utils::resolveUrlParts::v2($url);
      return select id from node where (urlParts.host is $parts.host and urlParts.path is $parts.path) or urlParts.host is $parts.host;
  };`;
  return [def];
}
