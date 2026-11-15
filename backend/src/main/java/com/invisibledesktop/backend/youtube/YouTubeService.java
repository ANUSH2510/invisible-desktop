package com.invisibledesktop.backend.youtube;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.HtmlUtils;

import java.util.List;

@Service
public class YouTubeService {

    private final RestClient restClient;
    private final String apiKey;

    public YouTubeService(@Value("${youtube.api.key}") String apiKey) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder()
                .baseUrl("https://www.googleapis.com/youtube/v3")
                .build();
    }

    public List<VideoResult> search(String query, int limit) {
        YouTubeSearchResponse response = restClient.get()
                .uri(uri -> uri.path("/search")
                        .queryParam("part", "snippet")
                        .queryParam("type", "video")
                        .queryParam("videoEmbeddable", "true")
                        .queryParam("maxResults", limit)
                        .queryParam("q", query)
                        .queryParam("regionCode", "IN")
                        .queryParam("relevanceLanguage", "en")
                        .queryParam("key", apiKey)
                        .build())
                .retrieve()
                .body(YouTubeSearchResponse.class);

        if (response == null || response.items() == null) {
            return List.of();
        }

        return response.items().stream()
                .map(item -> new VideoResult(
                        item.id().videoId(),
                        HtmlUtils.htmlUnescape(item.snippet().title()),
                        item.snippet().channelTitle(),
                        item.snippet().thumbnails().medium().url()))
                .toList();
    }
}