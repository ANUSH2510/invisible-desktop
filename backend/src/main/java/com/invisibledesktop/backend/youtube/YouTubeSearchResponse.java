package com.invisibledesktop.backend.youtube;

import java.util.List;

public record YouTubeSearchResponse(List<Item> items) {

    public record Item(Id id, Snippet snippet) {}

    public record Id(String videoId){}

    public record Snippet(String title, String channelTitle, Thumbnails thumbnails) {}

    public record Thumbnails(Thumbnail medium){}

    public record Thumbnail(String url){}


}
