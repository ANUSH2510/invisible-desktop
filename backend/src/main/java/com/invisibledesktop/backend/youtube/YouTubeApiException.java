package com.invisibledesktop.backend.youtube;

public class YouTubeApiException extends RuntimeException {
    public YouTubeApiException(String message, Throwable cause) {
        super(message, cause);
    }
}