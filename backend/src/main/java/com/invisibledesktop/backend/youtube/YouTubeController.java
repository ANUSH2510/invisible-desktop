package com.invisibledesktop.backend.youtube;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/youtube")
public class YouTubeController {

    private final YouTubeService youTubeService;

    public YouTubeController(YouTubeService youTubeService) {
        this.youTubeService = youTubeService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<VideoResult>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "5") int limit) {

        if (q.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        int safeLimit = Math.max(1, Math.min(limit, 10));
        return ResponseEntity.ok(youTubeService.search(q, safeLimit));
    }

    @ExceptionHandler(YouTubeApiException.class)
    public ResponseEntity<Map<String, String>> handleYouTubeError(YouTubeApiException e) {
        return ResponseEntity.status(503)
                .body(Map.of("error", "Search is unavailable right now. Try again later."));
    }
}
