package main

import (
	"context"
	"crypto/tls"
	"flag"
	"io"
	"log"
	"net/http"
	"strings"

	http3 "github.com/quic-go/quic-go/http3"
	wt "github.com/quic-go/webtransport-go"
)

type multiString []string

func (m *multiString) String() string { return strings.Join(*m, ",") }
func (m *multiString) Set(v string) error {
	*m = append(*m, v)
	return nil
}

func main() {
	addr := flag.String("addr", ":8443", "address to listen on")
	certFile := flag.String("cert", "certs/fullchain.pem", "TLS certificate file (PEM)")
	keyFile := flag.String("key", "certs/privkey.pem", "TLS private key file (PEM)")
	path := flag.String("path", "/webtransport", "WebTransport endpoint path")
	var allowOrigins multiString
	allowAnyOrigin := flag.Bool("allow-any-origin", false, "allow any Origin (dev)")
	flag.Var(&allowOrigins, "allow-origin", "allowed Origin value (repeatable)")
	flag.Parse()

	cert, err := tls.LoadX509KeyPair(*certFile, *keyFile)
	if err != nil {
		log.Fatalf("failed to load TLS certs: %v", err)
	}

	tlsConf := &tls.Config{
		Certificates: []tls.Certificate{cert},
		NextProtos:   []string{"h3"},
	}

	mux := http.NewServeMux()
	var wtServer wt.Server

	mux.HandleFunc(*path, func(w http.ResponseWriter, r *http.Request) {
		if r.ProtoMajor != 3 {
			http.Error(w, "requires HTTP/3", http.StatusBadRequest)
			return
		}
		sess, err := wtServer.Upgrade(w, r)
		if err != nil {
			log.Printf("upgrade failed: %v", err)
			return
		}
		log.Printf("new session from %s", r.RemoteAddr)
		go handleSession(sess)
	})

	wtServer = wt.Server{
		H3: http3.Server{
			Addr:      *addr,
			TLSConfig: tlsConf,
			Handler:   mux,
		},
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			// Allow non-browser clients with no Origin header
			if origin == "" {
				return true
			}
			if allowAnyOrigin != nil && *allowAnyOrigin {
				return true
			}
			for _, o := range allowOrigins {
				if o == origin {
					return true
				}
			}
			return false
		},
	}

	log.Printf("starting WebTransport server on %s at path %s", *addr, *path)
	if err := wtServer.ListenAndServe(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func handleSession(sess *wt.Session) {
	ctx := context.Background()
	go func() {
		for {
			str, err := sess.AcceptStream(ctx)
			if err != nil {
				log.Printf("accept stream error: %v", err)
				return
			}
			go func(s wt.Stream) {
				defer s.Close()
				if _, err := io.Copy(s, s); err != nil {
					log.Printf("echo stream error: %v", err)
				}
			}(str)
		}
	}()

	go func() {
		for {
			b, err := sess.ReceiveDatagram(ctx)
			if err != nil {
				log.Printf("receive datagram error: %v", err)
				return
			}
			if err := sess.SendDatagram(b); err != nil {
				log.Printf("send datagram error: %v", err)
				return
			}
		}
	}()
}
