DEFINE FUNCTION fn::memotron::curation::create($curation: any){
    return if $curation.type is "COLLECTION" {
        let $view = create view set type = $curation.defaultView, created = time::now(), modified = time::now();
        return create collection set label = $curation.label, views = $view, cover = $curation.cover, query = $curation.query, created = time::now(), modified = time::now();
    }
}